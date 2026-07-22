# MCP Video Converter Server

An MCP server that provides tools for checking FFmpeg installation and converting video files between various formats.

## Features

- **Check FFmpeg**: Verifies if FFmpeg is installed and accessible.
- **Convert Video**: Converts video, audio, and image files to various formats (e.g., MP4, WebM, MOV, MP3, PNG).
- **Format Info**: Get a list of supported file formats for conversion.

## Prerequisites

- Python 3.10+
- FFmpeg installed and available in your system's PATH
- [Optional] [uv](https://github.com/astral-sh/uv) for environment management

## Setup

1. Clone this repository:
   ```bash
   git clone https://github.com/adamanz/mcp-video-converter.git
   cd mcp-video-converter
   ```

2. Create and activate a virtual environment:
   ```bash
   # Using venv (standard library)
   python -m venv .venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   
   # Or using uv (recommended if available)
   uv venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   ```

3. Install dependencies:
   ```bash
   # Using pip
   pip install -e .
   pip install fastmcp

   # Or using uv
   uv pip install -e .
   uv pip install fastmcp
   ```

4. Verify your installation:
   ```bash
   # Run the installation check script
   python check_installation.py
   ```

## Running the Server Directly

You can run the server directly:

```bash
# Activate the virtual environment if not already activated
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Run the server
python -m mcp_video_converter.server
```

## Integrating with Claude Desktop

To add this MCP server to Claude Desktop:

1. Locate or create the Claude Desktop configuration file:
   ```bash
   # macOS
   mkdir -p ~/Library/Application\ Support/Claude/
   nano ~/Library/Application\ Support/Claude/claude_desktop_config.json
   
   # Windows
   mkdir -p %APPDATA%\Claude\
   notepad %APPDATA%\Claude\claude_desktop_config.json
   ```

2. Add the MCP server configuration:
   ```json
   {
     "mcpServers": {
       "video-convert": {
         "command": "/bin/bash",
         "args": [
           "-c",
           "cd /absolute/path/to/mcp-video-converter && source .venv/bin/activate && python -m mcp_video_converter.server"
         ]
       }
     }
   }
   ```

   **Windows Alternative:**
   ```json
   {
     "mcpServers": {
       "video-convert": {
         "command": "cmd.exe",
         "args": [
           "/c",
           "cd /d C:\\absolute\\path\\to\\mcp-video-converter && .venv\\Scripts\\activate && python -m mcp_video_converter.server"
         ]
       }
     }
   }
   ```

   Replace `/absolute/path/to/mcp-video-converter` with the absolute path to your repository.

3. Restart Claude Desktop
   - The server will appear as "video-convert" in the MCP tools menu

4. Important notes:
   - Always use absolute paths in your configuration
   - Make sure FFmpeg is installed and in your PATH
   - If you encounter issues, check the Claude Desktop logs:
     ```bash
     # macOS
     tail -n 20 -F ~/Library/Logs/Claude/mcp*.log
     
     # Windows
     type %APPDATA%\Claude\logs\mcp*.log
     ```

## Integrating with Cursor

To add this MCP server to Cursor:

1. Locate or create the Cursor configuration file:
   ```bash
   # macOS
   mkdir -p ~/.cursor/
   nano ~/.cursor/config.json
   
   # Windows
   mkdir -p %USERPROFILE%\.cursor\
   notepad %USERPROFILE%\.cursor\config.json
   ```

2. Add the MCP server configuration:
   ```json
   {
     "ai": {
       "mcpServers": {
         "video-convert": {
           "command": "/bin/bash",
           "args": [
             "-c",
             "cd /absolute/path/to/mcp-video-converter && source .venv/bin/activate && python -m mcp_video_converter.server"
           ]
         }
       }
     }
   }
   ```

   **Windows Alternative:**
   ```json
   {
     "ai": {
       "mcpServers": {
         "video-convert": {
           "command": "cmd.exe",
           "args": [
             "/c",
             "cd /d C:\\absolute\\path\\to\\mcp-video-converter && .venv\\Scripts\\activate && python -m mcp_video_converter.server"
           ]
         }
       }
     }
   }
   ```

   Replace `/absolute/path/to/mcp-video-converter` with the absolute path to your repository.

3. Restart Cursor
   - The server will be available to Claude in Cursor

4. Important notes:
   - Always use absolute paths in your configuration
   - Make sure FFmpeg is installed and in your PATH
   - Logs may be accessed through Cursor's developer tools

## Deploying with Smithery

Smithery is a platform that simplifies deploying and managing MCP servers. This project is fully configured for Smithery deployment with the required files and configurations.

### Required Configuration Files

This project includes all required configuration files for Smithery deployment:

1. **smithery.yaml**: Defines how to start your server and its configuration options
2. **Dockerfile**: Defines how to build your server's container image

### Smithery YAML Configuration

The `smithery.yaml` file provides Smithery with instructions on how to run your server:

```yaml
startCommand:
  type: stdio
  configSchema:
    type: object
    properties:
      ffmpegPath:
        type: string
        title: "FFmpeg Path"
        description: "Optional path to FFmpeg executable (uses system PATH by default)"
      outputDirectory:
        type: string
        title: "Output Directory"
        description: "Optional custom directory for output files"
      quality:
        type: string
        enum: ["low", "medium", "high"]
        default: "medium"
        title: "Default Quality"
  name: "MCP Video Converter"
  description: "Convert video files between formats and check FFmpeg installation"
  commandFunction: |
    (config) => {
      // Function that returns command details based on configuration options
    }

build:
  dockerfile: Dockerfile
  dockerBuildPath: .
  env:
    OUTPUT_DIRECTORY: "/data/converted"
  buildOptions:
    buildArgs:
      PYTHON_VERSION: "3.10"
      INSTALL_DEV: "false"
    labels:
      org.opencontainers.image.source: "https://github.com/adamanz/mcp-video-converter"
      org.opencontainers.image.description: "MCP Server for video conversion using FFmpeg"
      org.opencontainers.image.licenses: "MIT"
```

Key components:
- **type: stdio**: Defines that our server uses the standard I/O transport
- **configSchema**: Defines the configuration options users can set (FFmpeg path, output directory, quality)
- **commandFunction**: JavaScript function that returns how to start the server based on configuration
- **build**: Container-specific configuration for Dockerized deployment

### Deploying to Smithery

1. Install Smithery CLI if you haven't already:
   ```bash
   # Install the Smithery command-line tool
   npm install -g @smithery/cli
   ```

2. Login to Smithery:
   ```bash
   smithery login
   ```

3. Deploy directly from the repository:
   ```bash
   # Navigate to the repository directory
   cd /path/to/adamanz/mcp-video-converter

   # Deploy to Smithery
   smithery deploy
   ```

   Alternatively, deploy with explicit build options:
   ```bash
   # Deploy with container build
   smithery deploy --build

   # Deploy with custom build arguments
   smithery deploy --build --build-arg PYTHON_VERSION=3.11
   ```

4. Configure and start the server in Smithery:
   ```bash
   # Configure the server (interactive)
   smithery configure mcp-video-converter

   # Start the server
   smithery start mcp-video-converter
   ```

### Docker Support

This project includes a multi-stage Dockerfile for efficient containerized deployment. The container:

- Uses a multi-stage build process to reduce final image size
- Installs FFmpeg and all required dependencies
- Creates a dedicated volume mount point for converted files
- Includes a healthcheck for better container monitoring

You can build and run the Docker container manually:

```bash
# Build the container
docker build -t mcp-video-converter .

# Run the container
docker run -it --rm \
  -v $(pwd)/converted:/data/converted \
  -e FFMPEG_PATH=/usr/bin/ffmpeg \
  -e DEFAULT_QUALITY=high \
  mcp-video-converter
```

### Serverless Hosting Considerations

When deploying to Smithery's serverless environment, be aware of the following:

- **Connection Timeout**: Connections to your server will timeout after 2 minutes of inactivity
- **Ephemeral Storage**: Design your server with ephemeral storage in mind
- **Stateless Design**: The server should not rely on persistent local storage
- **Output Files**: Video conversion outputs should be returned properly as part of the tool response to ensure clients can access them

### Smithery Management

Useful Smithery commands for managing your deployment:

```bash
# View server logs
smithery logs mcp-video-converter

# Update to latest version
smithery update mcp-video-converter

# Stop the server
smithery stop mcp-video-converter

# Remove the server
smithery remove mcp-video-converter
```

### Integrating with Smithery Apps

Users can access your server through the Smithery app:

1. Open the Smithery application
2. Navigate to "Servers" tab
3. Select "mcp-video-converter"
4. Configure settings if prompted (FFmpeg path, output directory, quality)
5. Connect to the server
6. Use the server with compatible MCP clients

### Testing Before Deployment

Before deploying to Smithery, it's recommended to test your server locally:

```bash
# Test with MCP Inspector (if available)
mcp-inspector -s /path/to/mcp-video-converter/smithery.yaml

# Or test by running the server directly
cd /path/to/mcp-video-converter
python -m mcp_video_converter.server
```

## Troubleshooting Common Issues

### Server Not Found

If the MCP server is not being picked up:

1. Verify the paths in your configuration file are absolute and correct
2. Check that FFmpeg is installed and in your PATH
3. Ensure the virtual environment is activated in your command
4. Check the logs for specific error messages

### Python Module Not Found

If you see errors about missing modules:

1. Make sure you installed all dependencies with `pip install -e .` and `pip install fastmcp`
2. Verify the virtual environment is being activated correctly
3. Try reinstalling the package: `pip install -e .`

### FFmpeg Not Found

If FFmpeg cannot be found:

1. Verify FFmpeg is installed: `which ffmpeg` or `where ffmpeg` on Windows
2. Add the FFmpeg directory to your PATH
3. In the configuration, you can specify the full path to FFmpeg:
   ```json
   "env": {
     "PATH": "/usr/local/bin:/usr/bin:/bin:/path/to/ffmpeg/bin"
   }
   ```

## Example Usage (with Claude)

Once integrated, you can ask Claude to perform tasks like:

1. "Check if FFmpeg is installed on my system"
2. "Convert this video file: /path/to/video.webm to MP4 format with high quality"
3. "What video formats can I convert to?"

Claude will use the appropriate tools from the MCP server to accomplish these tasks.

## Advanced: Using with fastmcp client

For programmatic usage, you can use the fastmcp client:

```bash
# Check FFmpeg installation
fastmcp client call <SERVER_URL_OR_FILE_PATH> check_ffmpeg_installed '{}'

# Get supported formats
fastmcp client call <SERVER_URL_OR_FILE_PATH> get_supported_formats '{}'

# Convert a video
fastmcp client call <SERVER_URL_OR_FILE_PATH> convert_video '{
  "input_file_path": "/path/to/your/video.webm", 
  "output_format": "mp4", 
  "quality": "high"
}'
```

Replace `/path/to/your/video.webm` with an actual video file path.

## Supported Formats

- **Video**: MP4, WebM, MOV, AVI, MKV, FLV, GIF
- **Audio**: MP3, WAV, OGG, AAC, M4A
- **Image**: WebP, JPG, PNG, BMP, TIFF

## Running Tests

```bash
# Using pip
pip install pytest
pytest

# Using uv
uv pip install pytest
uv run pytest
```

## License

This project is open source and available under the [MIT License](LICENSE).

## Contributors

We would like to thank all contributors who have helped with this project, especially:

- **jlowin**: Contributed to fastmcp integration and server optimization techniques.
- **mk2112**: Implemented the core any-to-any video conversion capabilities.
- **wonderwhy-er**: Added desktop commander support and improved CLI functionality.

Special thanks to all the contributors in ai_docs who shared code examples, implementation techniques, and debugging suggestions that made this project possible.

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for details on how to contribute to this project.