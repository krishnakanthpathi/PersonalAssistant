#!/usr/bin/env python3
"""
Check if all the requirements for MCP Video Converter are met.
This script verifies:
- Python version
- FFmpeg installation
- Required Python packages
"""

import sys
import subprocess
import shutil
import importlib
from pathlib import Path

def check_python_version():
    print(f"Checking Python version...")
    required_version = (3, 10)
    current_version = sys.version_info
    
    if current_version >= required_version:
        print(f"✅ Python {sys.version.split()[0]} is installed (required: 3.10+)")
        return True
    else:
        print(f"❌ Python {current_version.major}.{current_version.minor} is installed but 3.10+ is required")
        return False

def check_ffmpeg():
    print(f"Checking FFmpeg installation...")
    ffmpeg_path = shutil.which("ffmpeg")
    if ffmpeg_path:
        try:
            result = subprocess.run([ffmpeg_path, "-version"], 
                                    capture_output=True, 
                                    text=True, 
                                    check=True)
            version_line = result.stdout.splitlines()[0]
            print(f"✅ FFmpeg is installed: {version_line}")
            return True
        except (subprocess.SubprocessError, IndexError):
            print("❌ FFmpeg found but could not get version information")
            return False
    else:
        print("❌ FFmpeg not found in PATH")
        return False
        
def check_python_packages():
    print(f"Checking required Python packages...")
    required_packages = ["fastmcp"]
    missing_packages = []
    
    for package in required_packages:
        try:
            importlib.import_module(package)
            print(f"✅ {package} is installed")
        except ImportError:
            print(f"❌ {package} is not installed")
            missing_packages.append(package)
    
    return len(missing_packages) == 0

def main():
    print("MCP Video Converter Installation Check")
    print("=====================================")
    
    python_ok = check_python_version()
    ffmpeg_ok = check_ffmpeg()
    packages_ok = check_python_packages()
    
    print("\nSummary:")
    if python_ok and ffmpeg_ok and packages_ok:
        print("✅ All requirements are met! You're ready to use MCP Video Converter.")
    else:
        print("❌ Some requirements are not met. Please address the issues above.")
        
        if not python_ok:
            print("  - Upgrade Python to version 3.10 or higher")
        
        if not ffmpeg_ok:
            print("  - Install FFmpeg (https://ffmpeg.org/download.html)")
        
        if not packages_ok:
            print("  - Install missing Python packages with: pip install fastmcp")
    
if __name__ == "__main__":
    main()