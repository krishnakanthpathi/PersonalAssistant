import os
import json
from typing import List, Dict, Any
from fastmcp import FastMCP, Context
from googleapiclient.discovery import build
from youtube_transcript_api import YouTubeTranscriptApi
import re
from urllib.parse import parse_qs, urlparse
import asyncio
from yt_dlp import YoutubeDL

# Initialize FastMCP server
mcp = FastMCP("youtube")

# YouTube Data API key (set this as an environment variable)
YOUTUBE_API_KEY = os.getenv('YOUTUBE_API_KEY')

if not YOUTUBE_API_KEY:
    print("Warning: YOUTUBE_API_KEY environment variable not set. YouTube search functionality will not work.")

def extract_video_id(url_or_title: str) -> str:
    """Extract video ID from YouTube URL or return None."""
    if 'youtube.com' in url_or_title or 'youtu.be' in url_or_title:
        # Handle different YouTube URL formats
        if 'youtu.be/' in url_or_title:
            return url_or_title.split('youtu.be/')[-1].split('?')[0]
        elif 'watch?v=' in url_or_title:
            parsed_url = urlparse(url_or_title)
            return parse_qs(parsed_url.query)['v'][0]
        elif '/embed/' in url_or_title:
            return url_or_title.split('/embed/')[-1].split('?')[0]
    return None

@mcp.tool()
def search_youtube_videos(search_term: str, num_videos: int = 5) -> List[Dict[str, Any]]:
    """
    Search YouTube videos based on a search term.

    Args:
        search_term: The search query for YouTube videos
        num_videos: Number of videos to retrieve (default: 5, max: 50)

    Returns:
        List of video information dictionaries containing title, video_id, channel, description, etc.
    """
    if not YOUTUBE_API_KEY:
        return [{"error": "YouTube API key not configured. Please set YOUTUBE_API_KEY environment variable."}]
    
    try:
        # Build YouTube service
        youtube_service = build('youtube', 'v3', developerKey=YOUTUBE_API_KEY)
        
        # Limit num_videos to reasonable bounds
        num_videos = min(max(1, num_videos), 50)
        
        # Search for videos
        search_response = youtube_service.search().list(
            q=search_term,
            part='snippet',
            type='video',
            maxResults=num_videos,
            order='relevance'
        ).execute()
        
        video_results = []
        for item in search_response['items']:
            video_info = {
                'video_id': item['id']['videoId'],
                'title': item['snippet']['title'],
                'channel': item['snippet']['channelTitle'],
                'description': item['snippet']['description'][:300] + '...' if len(item['snippet']['description']) > 300 else item['snippet']['description'],
                'published_at': item['snippet']['publishedAt'],
                'thumbnail_url': item['snippet']['thumbnails']['medium']['url'],
                'video_url': f"https://www.youtube.com/watch?v={item['id']['videoId']}"
            }
            video_results.append(video_info)
        
        return video_results
        
    except Exception as e:
        return [{"error": f"Failed to search YouTube videos: {str(e)}"}]

@mcp.tool()
def get_youtube_transcript(video_url_or_title: str) -> Dict[str, Any]:
    """
    Get the transcript of a YouTube video.

    Args:
        video_url_or_title: YouTube video URL or video ID

    Returns:
        Dictionary containing the video transcript and metadata
    """
    try:
        # Extract video ID from URL or use as-is if it's already an ID
        video_id = extract_video_id(video_url_or_title)
        
        if not video_id:
            # If no video ID found, assume it's a direct video ID
            video_id = video_url_or_title.strip()
        
        # Use the modern API from version 1.1.0
        ytt_api = YouTubeTranscriptApi()
        
        try:
            # Get list of available transcripts
            transcript_list = ytt_api.list(video_id)
            
            # Try to find the best available transcript
            # Priority: manually created transcripts in English, then other languages, then generated
            transcript = None
            
            # First try to get manually created English transcript
            try:
                transcript = transcript_list.find_manually_created_transcript(['en'])
            except Exception:
                # If no manual English transcript, try other manual transcripts
                try:
                    transcript = transcript_list.find_manually_created_transcript(['en-US', 'en-GB', 'es', 'fr', 'de'])
                except Exception:
                    # If no manual transcripts, try generated English transcript
                    try:
                        transcript = transcript_list.find_generated_transcript(['en'])
                    except Exception:
                        # If no generated English, try any generated transcript
                        try:
                            transcript = transcript_list.find_generated_transcript(['en-US', 'en-GB', 'es', 'fr', 'de'])
                        except Exception:
                            # Last resort: get the first available transcript
                            available_transcripts = list(transcript_list)
                            if available_transcripts:
                                transcript = available_transcripts[0]
                            else:
                                return {"error": "No transcripts available for this video"}
            
            # Fetch the actual transcript data
            fetched_transcript = transcript.fetch()
            
            # Convert to the format our tool expects (list of dict with start, duration, text)
            transcript_data = fetched_transcript.to_raw_data()
            
        except Exception as e:
            return {"error": f"Could not find transcript for video ID: {video_id}. Error: {str(e)}"}
        
        # Create a simple text-only transcript
        full_text = ""
        
        for entry in transcript_data:
            text = entry['text']
            full_text += text + " "
        
        # Remove any extra spaces and clean up the text
        full_text = full_text.replace("\n", " ").strip()
        while "  " in full_text:
            full_text = full_text.replace("  ", " ")
        
        return {
            'transcript': full_text
        }
        
    except Exception as e:
        return {"error": f"Failed to get transcript: {str(e)}. Make sure the video has captions available and the video ID/URL is correct."}

@mcp.tool()
async def download_youtube_video(video_url_or_title: str, ctx: Context) -> str:
    """
    Download a YouTube video.

    Args:
        video_url_or_title: The YouTube video URL or ID.
        
    Returns:
        A message indicating success and where the video was saved.
    """
    try:
        # Resolve ID / URL format (ensure we extract it or keep as-is)
        video_id = extract_video_id(video_url_or_title)
        url = video_url_or_title
        if video_id:
            url = f"https://www.youtube.com/watch?v={video_id}"
            
        loop = asyncio.get_running_loop()
        
        def progress_hook(d):
            if d['status'] == 'downloading':
                downloaded = d.get('downloaded_bytes', 0)
                total = d.get('total_bytes') or d.get('total_bytes_estimate', 0)
                filename = os.path.basename(d.get('filename', 'video.mp4'))
                
                if total > 0:
                    percent = (downloaded / total) * 100
                    percent_str = f"{percent:.1f}%"
                    asyncio.run_coroutine_threadsafe(
                        ctx.report_progress(progress=downloaded, total=total, message=f"Downloading {filename}: {percent_str}"),
                        loop
                    )
                else:
                    asyncio.run_coroutine_threadsafe(
                        ctx.report_progress(progress=downloaded, message=f"Downloading {filename}..."),
                        loop
                    )
            elif d['status'] == 'finished':
                filename = os.path.basename(d.get('filename', 'video.mp4'))
                asyncio.run_coroutine_threadsafe(
                    ctx.report_progress(progress=100, total=100, message=f"Finished downloading {filename}"),
                    loop
                )

        download_dir = os.path.expanduser("~/Downloads")
        os.makedirs(download_dir, exist_ok=True)
        
        ydl_opts = {
            'format': 'best',
            'outtmpl': os.path.join(download_dir, '%(title)s.%(ext)s'),
            'progress_hooks': [progress_hook],
            'quiet': True,
            'no_warnings': True,
        }
        
        def run_download():
            with YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=True)
                return ydl.prepare_filename(info)
                
        filepath = await asyncio.to_thread(run_download)
        return f"Successfully downloaded video to {filepath}"
    except Exception as e:
        return f"Failed to download video: {str(e)}"

if __name__ == "__main__":
    mcp.run(transport="stdio")
