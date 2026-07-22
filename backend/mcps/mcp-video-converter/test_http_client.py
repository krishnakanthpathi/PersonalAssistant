#!/usr/bin/env python3
import asyncio
import json
import aiohttp

async def main():
    print("Testing MCP server using direct HTTP requests...")
    
    async with aiohttp.ClientSession() as session:
        # Test listing tools
        print("\nListing tools:")
        
        try:
            # Create a list tools request
            tools_request = {
                "type": "mcp.request",
                "id": "test1",
                "method": "list:tools"
            }
            
            async with session.post("http://localhost:8000/mcp", 
                                   json=tools_request) as response:
                if response.status == 200:
                    data = await response.json()
                    print(f"Response: {json.dumps(data, indent=2)}")
                else:
                    print(f"Error: {response.status} - {await response.text()}")
        except Exception as e:
            print(f"Error connecting to server: {e}")
            
        print("\nTests completed")

if __name__ == "__main__":
    asyncio.run(main())