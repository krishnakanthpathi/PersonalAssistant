#!/usr/bin/env python3
"""
Simple MCP Server for Video Conversion

This script implements a basic MCP server that can:
1. Check if FFmpeg is installed
2. Convert webm files to mp4
"""

import asyncio
import json
import os
import subprocess
import sys
from pathlib import Path

# Constants
FFMPEG_PATH = "/opt/homebrew/bin/ffmpeg"  # Adjust if needed

async def check_ffmpeg_installed():
    """Check if FFmpeg is installed and available."""
    try:
        process = await asyncio.create_subprocess_exec(
            FFMPEG_PATH, "-version",
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )
        stdout, stderr = await process.communicate()
        
        if process.returncode == 0:
            version_info = stdout.decode(errors='replace').strip()
            first_line = version_info.splitlines()[0] if version_info else "Unknown version"
            
            write_response({
                "content": [
                    {
                        "type": "text",
                        "text": {
                            "installed": True,
                            "version": first_line
                        }
                    }
                ]
            })
        else:
            error = stderr.decode(errors='replace').strip()
            write_response({
                "content": [
                    {
                        "type": "text",
                        "text": {
                            "installed": False,
                            "error": f"FFmpeg found but version command failed: {error}"
                        }
                    }
                ]
            })
    except Exception as e:
        write_response({
            "content": [
                {
                    "type": "text",
                    "text": {
                        "installed": False,
                        "error": f"Error checking FFmpeg: {str(e)}"
                    }
                }
            ]
        })

async def convert_video(input_file_path, output_format="mp4", quality="high"):
    """Convert a video file to the specified format."""
    try:
        input_path = Path(input_file_path)
        
        if not input_path.exists():
            write_response({
                "content": [
                    {
                        "type": "text",
                        "text": {
                            "success": False,
                            "error": f"Input file not found: {input_file_path}"
                        }
                    }
                ]
            })
            return
        
        # Create output path
        output_dir = input_path.parent
        base_name = input_path.stem
        output_file = output_dir / f"{base_name}_converted.{output_format}"
        
        # Prepare FFmpeg command
        cmd = [
            FFMPEG_PATH, 
            "-y",                   # Overwrite output file if it exists
            "-i", str(input_path)   # Input file
        ]
        
        # Add quality settings
        if quality == "high":
            if output_format in ["mp4", "mkv", "webm", "mov"]:
                cmd.extend(["-c:v", "libx264", "-crf", "18", "-preset", "medium"])
                cmd.extend(["-c:a", "aac", "-b:a", "320k"])
        elif quality == "medium":
            if output_format in ["mp4", "mkv", "webm", "mov"]:
                cmd.extend(["-c:v", "libx264", "-crf", "23", "-preset", "medium"])
                cmd.extend(["-c:a", "aac", "-b:a", "192k"])
        else:  # low
            if output_format in ["mp4", "mkv", "webm", "mov"]:
                cmd.extend(["-c:v", "libx264", "-crf", "28", "-preset", "fast"])
                cmd.extend(["-c:a", "aac", "-b:a", "128k"])
        
        # Add output file
        cmd.append(str(output_file))
        
        # Progress updates
        write_response({
            "progress": {
                "progress": 10,
                "total": 100,
                "message": "Starting conversion..."
            }
        })
        
        # Run FFmpeg
        process = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )
        
        write_response({
            "progress": {
                "progress": 30,
                "total": 100,
                "message": "Processing..."
            }
        })
        
        stdout, stderr = await process.communicate()
        
        write_response({
            "progress": {
                "progress": 90,
                "total": 100,
                "message": "Finalizing..."
            }
        })
        
        if process.returncode == 0:
            write_response({
                "progress": {
                    "progress": 100,
                    "total": 100,
                    "message": "Complete!"
                }
            })
            
            # Verify output file
            if not output_file.exists() or output_file.stat().st_size == 0:
                write_response({
                    "content": [
                        {
                            "type": "text",
                            "text": {
                                "success": False,
                                "error": "Output file was not created or is empty"
                            }
                        }
                    ]
                })
                return
            
            write_response({
                "content": [
                    {
                        "type": "text",
                        "text": {
                            "success": True,
                            "output_file_path": str(output_file),
                            "message": "Video converted successfully."
                        }
                    }
                ]
            })
        else:
            error_message = stderr.decode(errors='replace').strip()
            write_response({
                "content": [
                    {
                        "type": "text",
                        "text": {
                            "success": False,
                            "error": f"FFmpeg conversion failed: {error_message}"
                        }
                    }
                ]
            })
    except Exception as e:
        write_response({
            "content": [
                {
                    "type": "text",
                    "text": {
                        "success": False,
                        "error": f"An error occurred during conversion: {str(e)}"
                    }
                }
            ]
        })

async def get_supported_formats():
    """Return a list of supported formats."""
    write_response({
        "content": [
            {
                "type": "text",
                "text": {
                    "success": True,
                    "formats": {
                        "video": ["mp4", "webm", "mov", "avi", "mkv", "flv", "gif"],
                        "audio": ["mp3", "wav", "ogg", "aac", "m4a"],
                        "image": ["webp", "jpg", "png", "bmp", "tiff"],
                    }
                }
            }
        ]
    })

def write_response(data):
    """Write a response to stdout in MCP format."""
    response = {
        "type": "mcp.response",
        **data
    }
    sys.stdout.write(json.dumps(response) + "\n")
    sys.stdout.flush()

async def main():
    """Main function to handle MCP requests."""
    for line in sys.stdin:
        try:
            data = json.loads(line)
            
            if data.get("type") == "mcp.request":
                request_id = data.get("id", "unknown")
                method = data.get("method", "")
                
                # Initialize response with request ID
                sys.stdout.write(json.dumps({
                    "type": "mcp.response.start",
                    "id": request_id
                }) + "\n")
                sys.stdout.flush()
                
                if method == "list:tools":
                    write_response({
                        "tools": [
                            {
                                "name": "check_ffmpeg_installed",
                                "description": "Checks if FFmpeg is installed and accessible."
                            },
                            {
                                "name": "convert_video",
                                "description": "Converts a video file to the specified output format.",
                                "parameters": {
                                    "input_file_path": {
                                        "type": "string",
                                        "description": "The absolute path to the input video file."
                                    },
                                    "output_format": {
                                        "type": "string",
                                        "default": "mp4",
                                        "description": "The desired output format (e.g., 'mp4', 'webm')."
                                    },
                                    "quality": {
                                        "type": "string",
                                        "enum": ["low", "medium", "high"],
                                        "default": "medium",
                                        "description": "The quality of the output file."
                                    }
                                }
                            },
                            {
                                "name": "get_supported_formats",
                                "description": "Returns a list of supported formats for conversion."
                            }
                        ]
                    })
                
                elif method == "call:tool":
                    tool_name = data.get("tool", "")
                    params = data.get("parameters", {})
                    
                    if tool_name == "check_ffmpeg_installed":
                        await check_ffmpeg_installed()
                    
                    elif tool_name == "convert_video":
                        input_file_path = params.get("input_file_path", "")
                        output_format = params.get("output_format", "mp4")
                        quality = params.get("quality", "medium")
                        
                        await convert_video(input_file_path, output_format, quality)
                    
                    elif tool_name == "get_supported_formats":
                        await get_supported_formats()
                    
                    else:
                        write_response({
                            "content": [
                                {
                                    "type": "text",
                                    "text": {
                                        "error": f"Unknown tool: {tool_name}"
                                    }
                                }
                            ]
                        })
                
                # End response
                sys.stdout.write(json.dumps({
                    "type": "mcp.response.end",
                    "id": request_id
                }) + "\n")
                sys.stdout.flush()
            
        except json.JSONDecodeError:
            continue
        except Exception as e:
            sys.stderr.write(f"Error: {str(e)}\n")
            sys.stderr.flush()

if __name__ == "__main__":
    asyncio.run(main())