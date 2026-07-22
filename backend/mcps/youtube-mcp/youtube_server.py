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
import httpx

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
async def download_youtube_video(video_url_or_title: str, quality: str = "best") -> str:
    """
    Download a YouTube video.

    Args:
        video_url_or_title: The YouTube video URL or ID.
        quality: Preferred video quality. Choose from: 'best', '1080p', '720p', '480p', '360p', 'audio_only'. Default is 'best'.
        
    Returns:
        A message indicating success and where the video was saved, plus download link.
    """
    try:
        # Resolve ID / URL format (ensure we extract it or keep as-is)
        video_id = extract_video_id(video_url_or_title)
        url = video_url_or_title
        if video_id:
            url = f"https://www.youtube.com/watch?v={video_id}"
            
        # Resolve target downloads directory inside the backend
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        download_dir = os.path.join(base_dir, 'backend', 'data', 'downloads')
        os.makedirs(download_dir, exist_ok=True)
        
        # 1. Resolve video metadata first (highly optimized, completes in <1s)
        def extract_info():
            ydl_opts_info = {
                'quiet': True,
                'no_warnings': True,
            }
            with YoutubeDL(ydl_opts_info) as ydl:
                return ydl.extract_info(url, download=False)

        info = await asyncio.to_thread(extract_info)
        title = info.get('title', 'video')
        
        filename_template = os.path.join(download_dir, '%(title)s.%(ext)s')
        
        # Get the exact output path
        with YoutubeDL({'outtmpl': filename_template}) as temp_ydl:
            filepath = temp_ydl.prepare_filename(info)
            
        filename = os.path.basename(filepath)
        
        # Map quality to format option in yt-dlp
        format_mapping = {
            'best': 'best',
            '1080p': 'bestvideo[height<=1080]+bestaudio/best[height<=1080]',
            '720p': 'bestvideo[height<=720]+bestaudio/best[height<=720]',
            '480p': 'bestvideo[height<=480]+bestaudio/best[height<=480]',
            '360p': 'bestvideo[height<=360]+bestaudio/best[height<=360]',
            'audio_only': 'bestaudio/best'
        }
        ydl_format = format_mapping.get(quality, 'best')
        
        # 2. Configure options for background download
        task_id = f"youtube_download_{video_id or 'unknown'}"
        
        def run_download():
            try:
                # Post initial starting state
                httpx.post("http://localhost:3000/api/mcp/progress", json={
                    "server": "youtube",
                    "taskId": task_id,
                    "progress": 0,
                    "total": 100,
                    "status": "running",
                    "message": f"Starting download: {filename}"
                }, timeout=2.0)
            except Exception as e:
                print(f"Failed to post initial progress: {e}")
                
            def progress_hook(d):
                payload = {
                    "server": "youtube",
                    "taskId": task_id,
                    "status": "running",
                    "message": f"Downloading {filename}"
                }
                if d['status'] == 'downloading':
                    downloaded = d.get('downloaded_bytes', 0)
                    total = d.get('total_bytes') or d.get('total_bytes_estimate', 0)
                    payload["progress"] = downloaded
                    payload["total"] = total
                    if total > 0:
                        pct = (downloaded / total) * 100
                        payload["message"] = f"Downloading {filename} ({pct:.1f}%)"
                elif d['status'] == 'finished':
                    payload["status"] = "finished"
                    payload["progress"] = 100
                    payload["total"] = 100
                    payload["message"] = f"Successfully downloaded: {filename}"
                
                try:
                    httpx.post("http://localhost:3000/api/mcp/progress", json=payload, timeout=2.0)
                except Exception as e:
                    print(f"Failed to post progress: {e}")

            ydl_opts_bg = {
                'format': ydl_format,
                'outtmpl': filename_template,
                'progress_hooks': [progress_hook],
                'quiet': True,
                'no_warnings': True,
            }
            
            try:
                with YoutubeDL(ydl_opts_bg) as ydl:
                    ydl.download([url])
            except Exception as e:
                print(f"Background download failed: {str(e)}")
                try:
                    httpx.post("http://localhost:3000/api/mcp/progress", json={
                        "server": "youtube",
                        "taskId": task_id,
                        "status": "failed",
                        "message": f"Download failed: {str(e)}"
                    }, timeout=2.0)
                except:
                    pass
                
        # 3. Start download in a background daemon thread so it doesn't block the client
        import threading
        thread = threading.Thread(target=run_download, daemon=True)
        thread.start()
        
        # URL encode filename for links
        from urllib.parse import quote
        safe_filename = quote(filename)
        
        return (
            f"Successfully started downloading '{title}' in the background ({quality}).\n"
            f"- Local file path: {filepath}\n"
            f"- Browser download link: http://localhost:3000/downloads/{safe_filename}"
        )
    except Exception as e:
        return f"Failed to download video: {str(e)}"

@mcp.tool()
async def play_youtube_audio(video_url_or_title: str) -> str:
    """
    Play the audio of a YouTube video or search query in the background using mpv.

    Args:
        video_url_or_title: YouTube video URL, video ID, or search query.

    Returns:
        A message indicating whether the playback started successfully.
    """
    # Extract video ID / URL
    video_id = extract_video_id(video_url_or_title)
    url = video_url_or_title
    
    # If it is not a direct URL/ID, search for it using YouTube Search API if key is set,
    # or let yt-dlp search for it directly using "ytsearch:" prefix
    if not video_id and not url.startswith('http'):
        if YOUTUBE_API_KEY:
            search_results = search_youtube_videos(video_url_or_title, 1)
            if search_results and "error" not in search_results[0]:
                url = search_results[0]['video_url']
                title = search_results[0]['title']
            else:
                url = f"ytsearch1:{video_url_or_title}"
                title = video_url_or_title
        else:
            url = f"ytsearch1:{video_url_or_title}"
            title = video_url_or_title
    else:
        title = "YouTube Video"

    # Stop any existing mpv instances first to prevent overlapping audio
    try:
        if os.name == 'nt':
            os.system("taskkill /f /im mpv.exe >nul 2>&1")
        else:
            os.system("pkill -f mpv >/dev/null 2>&1")
    except:
        pass

    # Launch mpv in background to stream audio (no-video)
    ytdlp_path = "/Users/krishnakanth/Projects/PersonalAssisstent/backend/mcps/youtube-mcp/.venv/bin/yt-dlp"
    
    cmd = [
        "mpv",
        "--no-video",
        f"--script-opts=ytdl_hook-ytdl_path={ytdlp_path}",
        url
    ]
    
    try:
        # Spawn headless subprocess
        process = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.DEVNULL,
            stderr=asyncio.subprocess.DEVNULL
        )
        return f"Playing audio for '{title}' in the background. Enjoy your music!"
    except Exception as e:
        return f"Failed to start playback. Make sure 'mpv' is installed via Homebrew. Error: {str(e)}"

@mcp.tool()
def stop_youtube_audio() -> str:
    """
    Stop the currently playing background audio.

    Returns:
        A message confirming playback was stopped.
    """
    try:
        if os.name == 'nt':
            os.system("taskkill /f /im mpv.exe >nul 2>&1")
        else:
            os.system("pkill -f mpv >/dev/null 2>&1")
        return "Playback stopped."
    except Exception as e:
        return f"Failed to stop playback: {str(e)}"

if __name__ == "__main__":
    mcp.run(transport="stdio")
