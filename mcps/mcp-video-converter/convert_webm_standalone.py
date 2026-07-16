#!/usr/bin/env python3
import asyncio
import subprocess
import os
from pathlib import Path

# Path to the test webm file
INPUT_FILE = "/Users/adamanzuoni/video-convert/testing/474efcb5-6054-4ccd-942a-4657afacc74e.webm"
OUTPUT_FORMAT = "mp4"

async def convert_video():
    """Convert the webm file to mp4 using FFmpeg directly."""
    input_path = Path(INPUT_FILE)
    
    if not input_path.exists():
        print(f"Error: Input file not found: {INPUT_FILE}")
        return False
    
    # Construct output path
    output_dir = input_path.parent
    base_name = input_path.stem
    output_file = output_dir / f"{base_name}_converted.{OUTPUT_FORMAT}"
    
    # Prepare FFmpeg command
    cmd = [
        "ffmpeg", 
        "-y",                   # Overwrite output file if it exists
        "-i", str(input_path),  # Input file
        "-c:v", "libx264",      # Video codec
        "-crf", "18",           # Quality (lower is better, 18 is high quality)
        "-preset", "medium",    # Encoding speed/compression tradeoff
        "-c:a", "aac",          # Audio codec
        "-b:a", "192k",         # Audio bitrate
        str(output_file)        # Output file
    ]
    
    print(f"Running command: {' '.join(cmd)}")
    
    try:
        # Run FFmpeg
        process = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )
        
        stdout, stderr = await process.communicate()
        
        if process.returncode == 0:
            print(f"Successfully converted to: {output_file}")
            return True
        else:
            err_msg = stderr.decode().strip()
            print(f"FFmpeg error: {err_msg}")
            return False
            
    except Exception as e:
        print(f"Error running FFmpeg: {e}")
        return False

async def main():
    print(f"Converting {INPUT_FILE} to {OUTPUT_FORMAT}...")
    success = await convert_video()
    if success:
        print("Conversion completed successfully!")
    else:
        print("Conversion failed.")

if __name__ == "__main__":
    asyncio.run(main())