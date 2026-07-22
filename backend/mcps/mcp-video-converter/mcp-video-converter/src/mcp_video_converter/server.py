import os
from pathlib import Path
from typing import Dict, Any, Optional

from fastmcp import FastMCP, Context
from .tools import check_ffmpeg_installed_impl, convert_video_impl, get_supported_formats_impl

# Create server instance
mcp_video_server = FastMCP(
    name="VideoConverterServer",
    instructions="A server for checking FFmpeg and converting videos between formats."
)

# Register the FFmpeg check tool
@mcp_video_server.tool()
async def check_ffmpeg_installed(ctx: Optional[Context] = None) -> Dict[str, Any]:
    """
    Checks if FFmpeg is installed and accessible.
    Returns a dictionary with 'installed' (bool) and 'version' (str) or 'error' (str).

    Args:
        ctx: Context for logging progress and results.
    """
    return await check_ffmpeg_installed_impl(ctx)

# Register the video conversion tool
@mcp_video_server.tool()
async def convert_video(
    input_file_path: str,
    output_format: str,
    quality: Optional[str] = None,
    framerate: Optional[int] = None,
    ctx: Optional[Context] = None
) -> Dict[str, Any]:
    """
    Converts a video file to the specified output format using FFmpeg.

    Args:
        input_file_path: The absolute path to the input video file.
        output_format: The desired output format (e.g., "mp4", "webm", "mov").
        quality: Optional quality setting ("low", "medium", "high").
        framerate: Optional framerate for video output.
        ctx: Context for progress reporting.

    Returns:
        A dictionary with conversion status, output file path, or an error message.
    """
    return await convert_video_impl(input_file_path, output_format, ctx, quality, framerate)

# Register the get supported formats tool
@mcp_video_server.tool()
async def get_supported_formats(ctx: Optional[Context] = None) -> Dict[str, Any]:
    """
    Returns a list of supported formats for conversion.

    Args:
        ctx: Context for logging.

    Returns:
        A dictionary with lists of supported formats by category.
    """
    return await get_supported_formats_impl(ctx)

def main_cli():
    """Entry point for running the server via command line."""
    import sys
    
    # Check if --http flag is passed
    if "--http" in sys.argv:
        print("HTTP mode is not supported in this version of the server")
        print("Running in stdio mode instead")
    
    # Run in stdio mode
    mcp_video_server.run()

if __name__ == "__main__":
    main_cli()