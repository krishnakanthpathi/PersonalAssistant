---
type: tool_group
title: MCP Server Management & Dynamic Integration
description: Enables creating, running, installing, and managing Model Context Protocol (MCP) servers and online runnable tools.
tags: [mcp, integrate, integrate_mcp_server, create_mcp, add_mcp, mcp_server, install_mcp, sse, stdio, connect_mcp, server_config]
tools: [integrate_mcp_server]
timestamp: 2026-07-21T22:45:00.000Z
---

# MCP Server Management & Dynamic Integration

This tool group enables the AI assistant to dynamically integrate, build, run, and connect MCP servers.

### Available Tools

- **`integrate_mcp_server`**: Integrates, creates, and runs an MCP server. Supports online runnable servers (SSE/HTTP URLs, npx/uvx packages) and local custom MCP servers. Automatically creates folders in `mcps/`, writes code files, updates `mcp-config.json`, hot-reloads connections, and auto-indexes OKF RAG catalog files.
