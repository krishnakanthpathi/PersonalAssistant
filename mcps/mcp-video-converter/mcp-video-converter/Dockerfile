# Multi-stage build for smaller final image

# Build stage
FROM python:3.10-slim AS builder

# Install build dependencies and uv
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    build-essential \
    python3-dev \
    curl && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/* && \
    curl -LsSf https://astral.sh/uv/install.sh | sh

# Set up working directory
WORKDIR /app

# Copy only what's needed for installation
COPY pyproject.toml README.md LICENSE ./
COPY src ./src/

# Use uv to install dependencies
RUN /root/.cargo/bin/uv pip install --no-cache-dir -e . && \
    /root/.cargo/bin/uv pip install --no-cache-dir fastmcp

# Runtime stage
FROM python:3.10-slim

# Install FFmpeg, runtime dependencies and uv
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    ffmpeg \
    ca-certificates \
    curl && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/* && \
    curl -LsSf https://astral.sh/uv/install.sh | sh

# Set up working directory
WORKDIR /app

# Copy Python packages from builder
COPY --from=builder /usr/local/lib/python3.10/site-packages /usr/local/lib/python3.10/site-packages
COPY --from=builder /root/.cargo/bin/uv /usr/local/bin/uv

# Copy source code
COPY --from=builder /app /app

# Copy tests for potential testing
COPY tests ./tests/

# Set environment variables
ENV PYTHONPATH="/app" \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH="/usr/local/bin:$PATH"

# Create directory for converted videos
RUN mkdir -p /app/converted_videos && \
    chmod 777 /app/converted_videos

# Healthcheck for container monitoring
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD python -c "import importlib.util; import sys; sys.exit(0 if importlib.util.find_spec('mcp_video_converter') else 1)"

# Default command to run the server using uv
# Command will be provided by smithery.yaml
CMD ["uv", "run", "-m", "mcp_video_converter.server"]

# Expose port for HTTP transport (if needed in the future)
EXPOSE 8000