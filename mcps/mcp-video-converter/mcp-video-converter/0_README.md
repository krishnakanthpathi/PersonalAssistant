# MCP Video Converter

An MCP server that provides tools for checking FFmpeg installation and converting video files between various formats.

## Features

- **Check FFmpeg**: Verifies if FFmpeg is installed and accessible.
- **Convert Video**: Converts video, audio, and image files to various formats (e.g., MP4, WebM, MOV, MP3, PNG).
- **Format Info**: Get a list of supported file formats for conversion.

[View Complete Documentation](README.md)

## Quick Start

```bash
# Clone the repository
git clone https://github.com/adamanz/mcp-video-converter.git
cd mcp-video-converter

# Set up environment and install
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -e .

# Run the server
python -m mcp_video_converter.server
```

## Supported Formats

- **Video**: MP4, WebM, MOV, AVI, MKV, FLV, GIF
- **Audio**: MP3, WAV, OGG, AAC, M4A
- **Image**: WebP, JPG, PNG, BMP, TIFF

## Integrations

- Claude Desktop 
- Cursor
- Smithery

## License

This project is open source and available under the [MIT License](LICENSE).