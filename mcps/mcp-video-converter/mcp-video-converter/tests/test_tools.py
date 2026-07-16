import asyncio
import shutil
from pathlib import Path
from unittest.mock import AsyncMock, patch

import pytest

from mcp_video_converter.server import mcp_video_server  # Import the server instance
from fastmcp import Client  # For testing the MCP server directly


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
    
    content = result[0].model_dump()["text"]  # Assuming TextContent
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
    video_file.write_text("dummy video content")  # Not a real video, but fine for mocking FFmpeg
    return video_file

@pytest.mark.asyncio
async def test_convert_video_successful(mcp_client: Client, sample_video_file: Path, tmp_path: Path):
    mock_process = AsyncMock()
    mock_process.returncode = 0
    mock_process.communicate.return_value = (b"ffmpeg output", b"")

    output_format = "webm"
    expected_output_dir = sample_video_file.parent / "converted_videos"
    expected_output_file = expected_output_dir / f"sample_converted.{output_format}"

    # Mock Path.resolve() to return the input path
    with patch("pathlib.Path.resolve", return_value=sample_video_file), \
         patch("pathlib.Path.is_file", return_value=True), \
         patch("pathlib.Path.exists", return_value=False), \
         patch("pathlib.Path.mkdir"), \
         patch("asyncio.create_subprocess_exec", return_value=mock_process) as mock_create_subprocess:
        result = await mcp_client.call_tool(
            "convert_video",
            {"input_file_path": str(sample_video_file), "output_format": output_format}
        )

    content = result[0].model_dump()["text"]
    assert content["success"] is True
    assert Path(content["output_file_path"]).name == expected_output_file.name
    assert "Video converted successfully" in content["message"]

@pytest.mark.asyncio
async def test_convert_video_ffmpeg_fails(mcp_client: Client, sample_video_file: Path, tmp_path: Path):
    mock_process = AsyncMock()
    mock_process.returncode = 1
    mock_process.communicate.return_value = (b"", b"FFmpeg specific error")
    
    output_format = "mov"

    # Mock Path methods
    with patch("pathlib.Path.resolve", return_value=sample_video_file), \
         patch("pathlib.Path.is_file", return_value=True), \
         patch("pathlib.Path.exists", return_value=False), \
         patch("pathlib.Path.mkdir"), \
         patch("asyncio.create_subprocess_exec", return_value=mock_process):
        result = await mcp_client.call_tool(
            "convert_video",
            {"input_file_path": str(sample_video_file), "output_format": output_format}
        )

    content = result[0].model_dump()["text"]
    assert content["success"] is False
    assert "FFmpeg conversion failed" in content["error"]
    assert "FFmpeg specific error" in content["error"]

@pytest.mark.asyncio
async def test_convert_video_input_file_not_found(mcp_client: Client, tmp_path: Path):
    non_existent_file = tmp_path / "not_found.mp4"
    
    # Mock Path.is_file() to return False
    with patch("pathlib.Path.resolve", return_value=non_existent_file), \
         patch("pathlib.Path.is_file", return_value=False):
        result = await mcp_client.call_tool(
            "convert_video",
            {"input_file_path": str(non_existent_file), "output_format": "mp4"}
        )
    
    content = result[0].model_dump()["text"]
    assert content["success"] is False
    assert "Input file not found" in content["error"]

@pytest.mark.asyncio
async def test_convert_video_unsupported_output_format(mcp_client: Client, sample_video_file: Path):
    # Mock Path.is_file() to return True for the sample video file
    with patch("pathlib.Path.resolve", return_value=sample_video_file), \
         patch("pathlib.Path.is_file", return_value=True):
        result = await mcp_client.call_tool(
            "convert_video",
            {"input_file_path": str(sample_video_file), "output_format": "exe"}
        )
    
    content = result[0].model_dump()["text"]
    assert content["success"] is False
    assert "Unsupported output format" in content["error"]

@pytest.mark.asyncio
async def test_get_supported_formats(mcp_client: Client):
    result = await mcp_client.call_tool("get_supported_formats", {})
    
    content = result[0].model_dump()["text"]
    assert content["success"] is True
    assert "formats" in content
    assert "video" in content["formats"]
    assert "audio" in content["formats"]
    assert "image" in content["formats"]
    assert "mp4" in content["formats"]["video"]
    assert "mp3" in content["formats"]["audio"]
    assert "jpg" in content["formats"]["image"]