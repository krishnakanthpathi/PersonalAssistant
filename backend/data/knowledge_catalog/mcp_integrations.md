---
type: integration
title: MCP & Workspace Integrations
description: Active Model Context Protocol integrations, Notion configs, YouTube requirements, and Gmail details.
tags: [integration, configs, mcp]
timestamp: 2026-07-19T14:46:00Z
---

# MCP & Workspace Integrations

## Notion Integration
- **Notion Page ID**: The default parent page ID is `396dcdd8ac5e80f98fe5ec6ea8d4414c`. Use this ID when creating pages, writing logs, or listing notes.

## Gmail Integration
- **Search Retrieval Only**: Always query messages using `search_threads` (e.g. query `""` or `"in:inbox"`). Do not call `list_messages` or `list_threads` directly as it causes prompt length/context overflow crashes.
- **Display Protocols**: Output emails in standard Markdown lists or tables containing:
  1. Sender Name / Email
  2. Subject
  3. Snippet/Summary
  4. Received Date/Time
  5. Thread ID

## YouTube Integration
- **Download Quality Check**: If a download is requested without a quality specification, ask the user to clarify quality preferences (e.g., 1080p, 720p, audio-only).
- **Background Dispatch**: Run the download in the background and supply the direct browser download link in the final markdown action response.

## GitHub Integration
- **In-Memory Operations**: Perform file edits and updates directly using the GitHub API/MCP server tools (`get_file_contents`, `create_or_update_file`, `push_files`).
- **CLI Rules**: Do not run shell `git` CLI operations on the local file system unless specifically requested to update the local workspace folder.

## Active MCP Servers
- **Filesystem**: File read/write capabilities on allowed directories under `/Users/krishnakanth`.
- **YouTube**: Searching video transcript extraction and metadata.
- **Firecrawl**: Web crawling and scraping.
- **Memory**: Entity and relation mapping (deprecating vector RAG in favor of this OKF directory catalog).
- **Video Converter**: Local video processing and converter server.
- **Terminal**: Shell/terminal command execution and workspace configurations. Restricts commands to allowed list (`ALLOWED_COMMANDS`).
