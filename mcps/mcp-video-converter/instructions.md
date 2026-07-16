Okay, here are the instructions for an LLM to create an MCP server. This server will include tools to check for FFmpeg installation and convert video files to user-specified formats, following best practices demonstrated in the `jlowin-fastmcp` repository.

```markdown
# Instructions for Creating an MCP Video Conversion Server

Your goal is to create a Python-based MCP (Model Context Protocol) server using the `fastmcp` library. This server will provide tools related to video processing: one to check if FFmpeg is installed on the user's system, and another to convert video files from one format to another using FFmpeg.

Follow the structure and best practices of the `jlowin-fastmcp` project.

## 1. Project Setup

### 1.1. Directory Structure

Create the following directory structure for your project:

```
mcp-video-converter/
├── src/
│   └── mcp_video_converter/
│       ├── __init__.py
│       ├── server.py       # Main server logic
│       ├── tools.py        # Tool implementations
│       └── py.typed
├── tests/
│   ├── __init__.py
│   └── test_tools.py     # Unit tests for the tools
├── pyproject.toml
├── README.md
└── .env.example          # Example environment variables, if any (not strictly needed for this)
```

### 1.2. `pyproject.toml`

Create a `pyproject.toml` file with the following content. This specifies project metadata and dependencies.

```toml
[project]
name = "mcp-video-converter"
version = "0.1.0"
description = "An MCP server with video conversion tools using FFmpeg."
authors = [{ name = "Your Name", email = "your.email@example.com" }]
requires-python = ">=3.10"
dependencies = [
    "fastmcp>=2.0.0", # Or the latest version available
    # Add other dependencies if needed, e.g., "ffmpeg-python" if you opt for it
]

[project.scripts]
mcp-video-converter = "mcp_video_converter.server:main_cli"

[tool.uv.sources] # Optional: if you want to specify sources for uv
"mcp-video-converter" = { editable = "." }

[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"

[tool.pytest.ini_options]
asyncio_mode = "auto"

# Add other tool configurations like ruff, pyright if desired, similar to jlowin-fastmcp
```

### 1.3. `src/mcp_video_converter/__init__.py`

This file can be empty or can expose key elements of your package. For now, an empty `__init__.py` is fine.

### 1.4. `src/mcp_video_converter/py.typed`

Create an empty file named `py.typed` in `src/mcp_video_converter/` to indicate that your package supports type checking.

## 2. Server Implementation

### 2.1. `src/mcp_video_converter/tools.py`

This file will contain the implementation of your tools.

```python
# src/mcp_video_converter/tools.py
import asyncio
import shutil
import subprocess
from pathlib import Path
from typing import Dict, Any, Tuple

from fastmcp import Context # If context features like logging or progress are needed

# Tool to check FFmpeg installation
async def check_ffmpeg_installed_impl() -> Dict[str, Any]:
    """
    Checks if FFmpeg is installed and accessible in the system PATH.

    Returns:
        A dictionary indicating FFmpeg status.
        Example: {"installed": True, "version": "ffmpeg version ..."} or
                 {"installed": False, "error": "FFmpeg not found."}
    """
    try:
        process = await asyncio.create_subprocess_exec(
            "ffmpeg", "-version",
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )
        stdout, stderr = await process.communicate()

        if process.returncode == 0:
            # FFmpeg typically prints version info to stdout or stderr
            version_info = stdout.decode(errors='replace').strip() or stderr.decode(errors='replace').strip()
            first_line = version_info.splitlines()[0] if version_info else "Unknown version"
            return {"installed": True, "version": first_line}
        else:
            error_message = stderr.decode(errors='replace').strip() or stdout.decode(errors='replace').strip()
            return {"installed": False, "error": f"FFmpeg found but version command failed: {error_message}"}
    except FileNotFoundError:
        return {"installed": False, "error": "FFmpeg not found in system PATH."}
    except Exception as e:
        return {"installed": False, "error": f"An unexpected error occurred: {str(e)}"}

# Tool to convert video
async def convert_video_impl(
    input_file_path_str: str,
    output_format: str,
    # ctx: Context # Uncomment if you need context features
) -> Dict[str, Any]:
    """
    Converts a video file to the specified output format using FFmpeg.

    Args:
        input_file_path_str: The absolute path to the input video file.
        output_format: The desired output format (e.g., "mp4", "webm", "mov").

    Returns:
        A dictionary with the conversion status and output file path if successful.
    """
    input_file_path = Path(input_file_path_str).resolve()
    if not input_file_path.is_file():
        return {"success": False, "error": f"Input file not found: {input_file_path_str}"}

    # Basic check for supported output format (can be expanded)
    supported_video_formats = ["mp4", "webm", "mov", "avi", "mkv", "flv", "gif"]
    if output_format.lower() not in supported_video_formats:
        return {
            "success": False,
            "error": f"Unsupported output format: {output_format}. Supported formats: {', '.join(supported_video_formats)}",
        }

    output_dir = input_file_path.parent / "converted_videos"
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # Construct output filename, ensuring it's unique if input has same name
    base_name = input_file_path.stem
    output_file_name = f"{base_name}_converted.{output_format.lower()}"
    output_file_path = output_dir / output_file_name
    
    # Handle potential filename collision (simple approach)
    counter = 1
    while output_file_path.exists():
        output_file_name = f"{base_name}_converted_{counter}.{output_format.lower()}"
        output_file_path = output_dir / output_file_name
        counter += 1

    # FFmpeg command
    # -y overwrites output file if it exists (though we try to make it unique)
    # -i specifies input file
    # You can add more FFmpeg options here for quality, codecs, etc.
    ffmpeg_command = [
        "ffmpeg",
        "-y",
        "-i", str(input_file_path),
        str(output_file_path)
    ]

    try:
        # await ctx.report_progress(progress=10, total=100) # Example progress
        process = await asyncio.create_subprocess_exec(
            *ffmpeg_command,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )
        stdout, stderr = await process.communicate()
        # await ctx.report_progress(progress=90, total=100) # Example progress

        if process.returncode == 0:
            # await ctx.report_progress(progress=100, total=100) # Example progress
            return {
                "success": True,
                "output_file_path": str(output_file_path),
                "message": "Video converted successfully."
            }
        else:
            error_message = stderr.decode(errors='replace').strip()
            return {
                "success": False,
                "error": f"FFmpeg conversion failed. Return code: {process.returncode}. Error: {error_message}",
                "command": " ".join(ffmpeg_command) # For debugging
            }
    except FileNotFoundError:
        return {"success": False, "error": "FFmpeg not found. Please ensure it's installed and in PATH."}
    except Exception as e:
        return {"success": False, "error": f"An error occurred during conversion: {str(e)}"}

```

### 2.2. `src/mcp_video_converter/server.py`

This file defines the MCP server and registers the tools.

```python
# src/mcp_video_converter/server.py
from pathlib import Path
from typing import Dict, Any

from fastmcp import FastMCP, Context # Context if tools use it
from .tools import check_ffmpeg_installed_impl, convert_video_impl

# Create server instance
mcp_video_server = FastMCP(
    name="VideoConverterServer",
    instructions="A server for checking FFmpeg and converting videos."
)

# Register the FFmpeg check tool
@mcp_video_server.tool()
async def check_ffmpeg_installed() -> Dict[str, Any]:
    """
    Checks if FFmpeg is installed and accessible.
    Returns a dictionary with 'installed' (bool) and 'version' (str) or 'error' (str).
    """
    return await check_ffmpeg_installed_impl()

# Register the video conversion tool
@mcp_video_server.tool()
async def convert_video(
    input_file_path: str,
    output_format: str,
    # ctx: Context # Add if convert_video_impl uses context
) -> Dict[str, Any]:
    """
    Converts a video file to the specified output format.

    Args:
        input_file_path: The absolute path to the input video file.
        output_format: The desired output format (e.g., "mp4", "webm").
    
    Returns:
        A dictionary with conversion status, output file path, or an error message.
    """
    # Consider input validation for input_file_path using Pydantic's FilePath if running locally
    # For a generic MCP tool, string path is safer. Client should ensure path validity.
    return await convert_video_impl(input_file_path, output_format) #, ctx)


def main_cli():
    """Entry point for running the server via command line."""
    mcp_video_server.run()

if __name__ == "__main__":
    main_cli()
```

## 3. Unit Tests

### 3.1. `tests/__init__.py`

This file can be empty.

### 3.2. `tests/test_tools.py`

Implement unit tests for your tools. You'll need to mock `subprocess` calls.

```python
# tests/test_tools.py
import asyncio
import shutil
from pathlib import Path
from unittest.mock import AsyncMock, patch

import pytest

from mcp_video_converter.server import mcp_video_server # Import the server instance
from fastmcp import Client # For testing the MCP server directly


@pytest.fixture
async def mcp_client():
    """Provides a FastMCP client connected to the server instance for testing."""
    async with Client(mcp_video_server) as client:
        yield client

@pytest.mark.asyncio
async def test_check_ffmpeg_installed_when_present(mcp_client: Client):
    # Mock asyncio.create_subprocess_exec
    mock_process = AsyncMock()
    mock_process.returncode = 0
    mock_process.communicate.return_value = (b"ffmpeg version N-12345-gfedcba", b"")

    with patch("asyncio.create_subprocess_exec", return_value=mock_process) as mock_create_subprocess:
        result = await mcp_client.call_tool("check_ffmpeg_installed", {})
    
    content = result[0].model_dump()["text"] # Assuming TextContent
    assert content["installed"] is True
    assert "ffmpeg version N-12345-gfedcba" in content["version"]
    mock_create_subprocess.assert_called_once_with(
        "ffmpeg", "-version", stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
    )

@pytest.mark.asyncio
async def test_check_ffmpeg_not_installed(mcp_client: Client):
    with patch("asyncio.create_subprocess_exec", side_effect=FileNotFoundError) as mock_create_subprocess:
        result = await mcp_client.call_tool("check_ffmpeg_installed", {})

    content = result[0].model_dump()["text"]
    assert content["installed"] is False
    assert "FFmpeg not found" in content["error"]
    mock_create_subprocess.assert_called_once_with(
        "ffmpeg", "-version", stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
    )

@pytest.mark.asyncio
async def test_check_ffmpeg_command_fails(mcp_client: Client):
    mock_process = AsyncMock()
    mock_process.returncode = 1
    mock_process.communicate.return_value = (b"", b"Some ffmpeg error")

    with patch("asyncio.create_subprocess_exec", return_value=mock_process):
        result = await mcp_client.call_tool("check_ffmpeg_installed", {})

    content = result[0].model_dump()["text"]
    assert content["installed"] is False
    assert "FFmpeg found but version command failed" in content["error"]
    assert "Some ffmpeg error" in content["error"]

@pytest.fixture
def sample_video_file(tmp_path: Path) -> Path:
    """Creates a dummy video file for testing."""
    video_file = tmp_path / "sample.mp4"
    video_file.write_text("dummy video content") # Not a real video, but fine for mocking FFmpeg
    return video_file

@pytest.mark.asyncio
async def test_convert_video_successful(mcp_client: Client, sample_video_file: Path, tmp_path: Path):
    mock_process = AsyncMock()
    mock_process.returncode = 0
    mock_process.communicate.return_value = (b"ffmpeg output", b"")

    output_format = "webm"
    expected_output_dir = sample_video_file.parent / "converted_videos"
    expected_output_file = expected_output_dir / f"sample_converted.{output_format}"

    with patch("asyncio.create_subprocess_exec", return_value=mock_process) as mock_create_subprocess:
        result = await mcp_client.call_tool(
            "convert_video",
            {"input_file_path": str(sample_video_file), "output_format": output_format}
        )

    content = result[0].model_dump()["text"]
    assert content["success"] is True
    assert Path(content["output_file_path"]).name == expected_output_file.name
    assert Path(content["output_file_path"]).parent == expected_output_dir
    assert "Video converted successfully" in content["message"]
    
    mock_create_subprocess.assert_called_once_with(
        "ffmpeg", "-y", "-i", str(sample_video_file), str(expected_output_file),
        stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
    )
    
    # Clean up created directory
    if expected_output_dir.exists():
        shutil.rmtree(expected_output_dir)


@pytest.mark.asyncio
async def test_convert_video_ffmpeg_fails(mcp_client: Client, sample_video_file: Path, tmp_path: Path):
    mock_process = AsyncMock()
    mock_process.returncode = 1
    mock_process.communicate.return_value = (b"", b"FFmpeg specific error")
    
    output_format = "mov"
    expected_output_dir = sample_video_file.parent / "converted_videos"

    with patch("asyncio.create_subprocess_exec", return_value=mock_process):
        result = await mcp_client.call_tool(
            "convert_video",
            {"input_file_path": str(sample_video_file), "output_format": output_format}
        )

    content = result[0].model_dump()["text"]
    assert content["success"] is False
    assert "FFmpeg conversion failed" in content["error"]
    assert "FFmpeg specific error" in content["error"]
    
    if expected_output_dir.exists():
        shutil.rmtree(expected_output_dir)

@pytest.mark.asyncio
async def test_convert_video_input_file_not_found(mcp_client: Client, tmp_path: Path):
    non_existent_file = tmp_path / "not_found.mp4"
    result = await mcp_client.call_tool(
        "convert_video",
        {"input_file_path": str(non_existent_file), "output_format": "mp4"}
    )
    
    content = result[0].model_dump()["text"]
    assert content["success"] is False
    assert "Input file not found" in content["error"]

@pytest.mark.asyncio
async def test_convert_video_unsupported_output_format(mcp_client: Client, sample_video_file: Path):
    result = await mcp_client.call_tool(
        "convert_video",
        {"input_file_path": str(sample_video_file), "output_format": "exe"}
    )
    content = result[0].model_dump()["text"]
    assert content["success"] is False
    assert "Unsupported output format" in content["error"]

@pytest.mark.asyncio
async def test_convert_video_ffmpeg_not_found(mcp_client: Client, sample_video_file: Path, tmp_path: Path):
    expected_output_dir = sample_video_file.parent / "converted_videos"
    with patch("asyncio.create_subprocess_exec", side_effect=FileNotFoundError):
        result = await mcp_client.call_tool(
            "convert_video",
            {"input_file_path": str(sample_video_file), "output_format": "mp4"}
        )
    
    content = result[0].model_dump()["text"]
    assert content["success"] is False
    assert "FFmpeg not found" in content["error"]
    
    if expected_output_dir.exists():
        shutil.rmtree(expected_output_dir)
```

## 4. README.md

Create a `README.md` file in the root of your project:

```markdown
# MCP Video Converter Server

An MCP server that provides tools for checking FFmpeg installation and converting video files.

## Features

- **Check FFmpeg**: Verifies if FFmpeg is installed and accessible.
- **Convert Video**: Converts video files to various formats (e.g., MP4, WebM, MOV).

## Prerequisites

- Python 3.10+
- [uv](https://github.com/astral-sh/uv) (recommended for environment management)
- FFmpeg installed and available in your system's PATH.

## Setup

1.  Clone this repository.
2.  Create and activate a virtual environment:
    ```bash
    uv venv
    source .venv/bin/activate  # On Windows: .venv\Scripts\activate
    ```
3.  Install dependencies:
    ```bash
    uv pip install -e .
    ```

## Running the Server

You can run the server directly using its CLI entry point:

```bash
mcp-video-converter
```

Or via `fastmcp`:

```bash
fastmcp run src/mcp_video_converter/server.py
```

## Example Usage (with `fastmcp client`)

Assuming the server is running.

**Check FFmpeg installation:**

```bash
fastmcp client call <SERVER_URL_OR_FILE_PATH> check_ffmpeg_installed '{}'
```

**Convert a video:**

```bash
fastmcp client call <SERVER_URL_OR_FILE_PATH> convert_video '{"input_file_path": "/path/to/your/video.mp4", "output_format": "webm"}'
```
Replace `/path/to/your/video.mp4` with an actual video file path.

## Running Tests

```bash
uv run pytest
```
```

## 5. Final Steps

-   Ensure all Python files have appropriate imports.
-   Install dependencies: `uv pip install fastmcp pytest pytest-asyncio`
-   Run tests: `uv run pytest`
-   You can run the server using: `python -m src.mcp_video_converter.server` (if your `PYTHONPATH` is set up correctly, or after installing with `uv pip install -e .`) or by using the script defined in `pyproject.toml`: `mcp-video-converter`.

This set of instructions should guide an LLM to create the described MCP server, tools, and tests. Remember that FFmpeg itself is a system dependency and must be installed separately by the user. The server only interacts with it via the command line.
```