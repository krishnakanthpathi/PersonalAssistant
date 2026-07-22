import os
import pytest
import asyncio
import logging
import time
from pathlib import Path
import shutil
import subprocess

from mcp_video_converter.tools import convert_video_impl, check_ffmpeg_installed_impl, get_supported_formats_impl
from mcp_video_converter.server import mcp_video_server
from fastmcp import Client

# Configure logging for tests
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Path to the test webm file
TEST_WEBM_FILE = "/Users/adamanzuoni/video-convert/testing/474efcb5-6054-4ccd-942a-4657afacc74e.webm"
OUTPUT_DIR = "/Users/adamanzuoni/video-convert/testing"

@pytest.fixture(scope="module")
def ffmpeg_available():
    """Check if FFmpeg is available before running tests."""
    try:
        result = subprocess.run(["ffmpeg", "-version"], 
                              capture_output=True, 
                              text=True, 
                              check=False)
        is_available = result.returncode == 0
        if not is_available:
            logger.warning("FFmpeg is not available. Some tests will be skipped.")
        return is_available
    except FileNotFoundError:
        logger.warning("FFmpeg executable not found. Some tests will be skipped.")
        return False

@pytest.fixture(scope="module")
def test_file_exists():
    """Check if the test file exists."""
    exists = os.path.isfile(TEST_WEBM_FILE)
    if not exists:
        logger.warning(f"Test file not found: {TEST_WEBM_FILE}")
    return exists

class TestRealConversion:
    """Tests with real file conversion using FFmpeg."""
    
    @pytest.fixture
    async def mcp_client(self):
        """Provides a FastMCP client connected to the server instance for testing."""
        logger.info("Setting up MCP client")
        async with Client(mcp_video_server) as client:
            yield client
        logger.info("MCP client closed")
    
    @pytest.mark.asyncio
    async def test_check_ffmpeg_installed_real(self, mcp_client, ffmpeg_available):
        """Test if FFmpeg is actually installed on the system."""
        logger.info("Testing FFmpeg installation check")
        
        result = await mcp_client.call_tool("check_ffmpeg_installed", {})
        content = result[0].model_dump()["text"]
        
        logger.info(f"FFmpeg check result: {content}")
        
        if ffmpeg_available:
            assert content["installed"] is True, "FFmpeg should be installed"
            assert "version" in content, "Version information should be available"
        else:
            pytest.skip("FFmpeg is not available, skipping this test")
    
    @pytest.mark.asyncio
    async def test_get_supported_formats(self, mcp_client):
        """Test retrieving supported formats."""
        logger.info("Testing get_supported_formats")
        
        result = await mcp_client.call_tool("get_supported_formats", {})
        content = result[0].model_dump()["text"]
        
        logger.info(f"Supported formats result: {content}")
        
        assert content["success"] is True, "Should successfully retrieve formats"
        assert "formats" in content, "Response should include formats dictionary"
        assert "video" in content["formats"], "Video formats should be included"
        assert "audio" in content["formats"], "Audio formats should be included"
        assert "image" in content["formats"], "Image formats should be included"
        
        # Verify specific formats are included
        assert "mp4" in content["formats"]["video"], "MP4 should be in video formats"
        assert "mp3" in content["formats"]["audio"], "MP3 should be in audio formats"
        assert "png" in content["formats"]["image"], "PNG should be in image formats"
    
    @pytest.mark.asyncio
    async def test_convert_webm_to_mp4_real(self, mcp_client, ffmpeg_available, test_file_exists):
        """Test converting a real webm file to mp4."""
        if not ffmpeg_available:
            pytest.skip("FFmpeg is not available, skipping this test")
        if not test_file_exists:
            pytest.skip("Test file not found, skipping this test")
        
        logger.info(f"Testing webm to mp4 conversion with file: {TEST_WEBM_FILE}")
        
        # Verify file size and validity before test
        file_size = os.path.getsize(TEST_WEBM_FILE)
        logger.info(f"Test file size: {file_size} bytes")
        assert file_size > 0, "Test file should not be empty"
        
        start_time = time.time()
        
        # Call the convert_video tool
        result = await mcp_client.call_tool(
            "convert_video",
            {
                "input_file_path": TEST_WEBM_FILE,
                "output_format": "mp4",
                "quality": "high"
            }
        )
        
        content = result[0].model_dump()["text"]
        logger.info(f"Conversion result: {content}")
        
        elapsed_time = time.time() - start_time
        logger.info(f"Conversion took {elapsed_time:.2f} seconds")
        
        # Check if conversion was successful
        assert content["success"] is True, f"Conversion failed: {content.get('error', 'Unknown error')}"
        assert "output_file_path" in content, "Output path should be in the result"
        assert content["output_file_path"].endswith(".mp4"), "Output should be an MP4 file"
        
        # Verify the output file exists
        output_file = content["output_file_path"]
        assert os.path.exists(output_file), f"Output file was not created: {output_file}"
        
        # Verify the output file has a non-zero size
        output_size = os.path.getsize(output_file)
        logger.info(f"Output file size: {output_size} bytes")
        assert output_size > 0, "Output file should not be empty"
        
        # Check that output is a valid MP4 file by trying to get info with ffprobe
        try:
            ffprobe_cmd = ["ffprobe", "-v", "error", "-show_format", "-show_streams", output_file]
            probe_result = subprocess.run(ffprobe_cmd, capture_output=True, text=True, check=False)
            assert probe_result.returncode == 0, "FFprobe should be able to read the MP4 file"
            logger.info("Output is a valid MP4 file according to ffprobe")
        except (subprocess.SubprocessError, FileNotFoundError) as e:
            logger.warning(f"Could not validate MP4 with ffprobe: {e}")
        
        # Copy the output file to the testing directory
        try:
            dest_path = os.path.join(OUTPUT_DIR, os.path.basename(output_file))
            shutil.copy2(output_file, dest_path)
            logger.info(f"Copied converted file to: {dest_path}")
        except Exception as e:
            logger.error(f"Could not copy test file to testing directory: {e}")
    
    @pytest.mark.asyncio
    async def test_convert_webm_to_mp4_direct(self, ffmpeg_available, test_file_exists):
        """Test converting a real webm file to mp4 using the implementation function directly."""
        if not ffmpeg_available:
            pytest.skip("FFmpeg is not available, skipping this test")
        if not test_file_exists:
            pytest.skip("Test file not found, skipping this test")
        
        logger.info(f"Testing direct webm to mp4 conversion with file: {TEST_WEBM_FILE}")
        
        start_time = time.time()
        
        # Call the convert_video_impl function directly
        result = await convert_video_impl(
            input_file_path_str=TEST_WEBM_FILE,
            output_format="mp4",
            quality="high"
        )
        
        elapsed_time = time.time() - start_time
        logger.info(f"Direct conversion took {elapsed_time:.2f} seconds")
        logger.info(f"Direct conversion result: {result}")
        
        # Check if conversion was successful
        assert result["success"] is True, f"Direct conversion failed: {result.get('error', 'Unknown error')}"
        assert "output_file_path" in result, "Output path should be in the result"
        assert result["output_file_path"].endswith(".mp4"), "Output should be an MP4 file"
        
        # Verify the output file exists
        output_file = result["output_file_path"]
        assert os.path.exists(output_file), f"Output file was not created: {output_file}"
        
        # Verify the output file has a non-zero size
        output_size = os.path.getsize(output_file)
        logger.info(f"Output file size: {output_size} bytes")
        assert output_size > 0, "Output file should not be empty"
        
        # Copy the output file to the testing directory with a different name to avoid conflicts
        try:
            output_filename = f"direct_{os.path.basename(output_file)}"
            dest_path = os.path.join(OUTPUT_DIR, output_filename)
            shutil.copy2(output_file, dest_path)
            logger.info(f"Copied converted file to: {dest_path}")
        except Exception as e:
            logger.error(f"Could not copy test file to testing directory: {e}")
    
    @pytest.mark.asyncio
    async def test_convert_webm_to_formats(self, mcp_client, ffmpeg_available, test_file_exists):
        """Test converting the webm file to multiple formats."""
        if not ffmpeg_available:
            pytest.skip("FFmpeg is not available, skipping this test")
        if not test_file_exists:
            pytest.skip("Test file not found, skipping this test")
        
        # Test a few different formats
        formats_to_test = ["mp3", "gif", "jpg"]
        
        for fmt in formats_to_test:
            logger.info(f"Testing conversion to {fmt}")
            
            result = await mcp_client.call_tool(
                "convert_video",
                {
                    "input_file_path": TEST_WEBM_FILE,
                    "output_format": fmt,
                    "quality": "medium"
                }
            )
            
            content = result[0].model_dump()["text"]
            logger.info(f"Conversion to {fmt} result: {content}")
            
            # If format conversion is supported, verify the result
            if content["success"]:
                assert "output_file_path" in content, f"Output path should be in the result for {fmt}"
                assert content["output_file_path"].endswith(f".{fmt}"), f"Output should be a {fmt} file"
                
                # Verify the output file exists and has content
                output_file = content["output_file_path"]
                assert os.path.exists(output_file), f"Output file was not created: {output_file}"
                assert os.path.getsize(output_file) > 0, f"Output {fmt} file should not be empty"
                
                # Copy to testing directory
                try:
                    dest_path = os.path.join(OUTPUT_DIR, os.path.basename(output_file))
                    shutil.copy2(output_file, dest_path)
                    logger.info(f"Copied {fmt} file to: {dest_path}")
                except Exception as e:
                    logger.error(f"Could not copy {fmt} file to testing directory: {e}")
            else:
                logger.warning(f"Conversion to {fmt} not supported or failed: {content.get('error')}")
                
    @pytest.mark.asyncio
    async def test_error_handling_invalid_input(self, mcp_client):
        """Test error handling with invalid input file."""
        logger.info("Testing error handling with invalid input file")
        
        non_existent_file = "/path/to/nonexistent/file.webm"
        
        result = await mcp_client.call_tool(
            "convert_video",
            {
                "input_file_path": non_existent_file,
                "output_format": "mp4"
            }
        )
        
        content = result[0].model_dump()["text"]
        logger.info(f"Invalid input result: {content}")
        
        assert content["success"] is False, "Should fail with non-existent file"
        assert "error" in content, "Error message should be provided"
        assert "not found" in content["error"].lower(), "Error should indicate file not found"
    
    @pytest.mark.asyncio
    async def test_error_handling_invalid_format(self, mcp_client, test_file_exists):
        """Test error handling with invalid output format."""
        if not test_file_exists:
            pytest.skip("Test file not found, skipping this test")
            
        logger.info("Testing error handling with invalid output format")
        
        result = await mcp_client.call_tool(
            "convert_video",
            {
                "input_file_path": TEST_WEBM_FILE,
                "output_format": "invalid_format"
            }
        )
        
        content = result[0].model_dump()["text"]
        logger.info(f"Invalid format result: {content}")
        
        assert content["success"] is False, "Should fail with invalid format"
        assert "error" in content, "Error message should be provided"
        assert "unsupported" in content["error"].lower(), "Error should indicate unsupported format"