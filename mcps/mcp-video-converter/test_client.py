#!/usr/bin/env python3
import asyncio
import sys
import os
from fastmcp import Client
from mcp.transport.http import HTTPTransport

async def main():
    print("Testing MCP server using FastMCP client...")

    # Create HTTP transport for the client
    transport = HTTPTransport("http://localhost:8000/mcp")

    # Connect to the MCP server directly
    async with Client(transport=transport) as client:
        print("Connected to MCP server")

        # List available tools
        print("\nListing tools:")
        tools = await client.list_tools()
        for tool in tools:
            print(f"- {tool.name}: {tool.description}")

        # Test FFmpeg installation
        print("\nChecking FFmpeg installation:")
        try:
            ffmpeg_result = await client.call_tool("check_ffmpeg_installed", {})
            print(f"FFmpeg result: {ffmpeg_result}")
        except Exception as e:
            print(f"Error checking FFmpeg: {e}")

        # Test getting supported formats
        print("\nGetting supported formats:")
        try:
            formats_result = await client.call_tool("get_supported_formats", {})
            print(f"Formats: {formats_result}")
        except Exception as e:
            print(f"Error getting formats: {e}")

        print("\nTests completed")

if __name__ == "__main__":
    asyncio.run(main())