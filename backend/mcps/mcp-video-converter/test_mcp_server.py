import asyncio
import json
import os
import signal
import subprocess
import time
from fastmcp import Client
from mcp_video_converter.server import mcp_video_server  # Import the server instance directly

async def main():
    print("Testing MCP server directly...")
    
    # Use the direct server instance
    async with Client(mcp_video_server) as client:
        print("Connected to MCP server")
        
        # Test FFmpeg installation
        print("\nChecking FFmpeg installation:")
        ffmpeg_result = await client.call_tool("check_ffmpeg_installed", {})
        for content in ffmpeg_result:
            print(f"- {content.model_dump()}")
        
        # Test getting supported formats
        print("\nGetting supported formats:")
        formats_result = await client.call_tool("get_supported_formats", {})
        for content in formats_result:
            print(f"- {content.model_dump()}")
        
        print("\nTests completed successfully")

if __name__ == "__main__":
    asyncio.run(main())