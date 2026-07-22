---
type: tool_group
title: Filesystem Operations & File Management
description: A comprehensive suite of tools for reading, writing, editing, and managing files and directories with support for batch operations, metadata inspection, and macOS extended attributes.
tags: [filesystem, files, directories, read, write, copy, move, delete, edit, pdf, metadata, xattr, watch, list, stat, fs_read, fs_write, fs_edit, fs_copy, fs_move, fs_delete, fs_list, fs_stat, fs_read_many, fs_write_pdf, fs_make_dir, fs_watch_once, fs_xattr_get, fs_xattr_set, file-management, batch-operations]
tools: [fs_read, fs_read_many, fs_write, fs_edit, fs_write_pdf, fs_list, fs_stat, fs_copy, fs_move, fs_make_dir, fs_delete, fs_watch_once, fs_xattr_get, fs_xattr_set]
timestamp: 2026-07-21T09:39:24.529Z
---

# Filesystem Operations & File Management

The **Filesystem** tool group provides complete file and directory manipulation capabilities within the `/Users/krishnakanth` sandbox. These tools enable safe, atomic file operations with size limits and access controls.

### Available Tools

| Tool | Description |
|------|-------------|
| `fs_read` | Read a single file (UTF-8 text or base64), up to 10 MB |
| `fs_read_many` | Batch read up to 50 files (10 MB total) in one operation |
| `fs_write` | Write a file (text or base64), up to 50 MB |
| `fs_edit` | Perform find/replace edits with atomic write and optional match count verification |
| `fs_write_pdf` | Render plain text content to a PDF file (letter/a4/legal paper sizes) |
| `fs_list` | List directory contents with name, kind, size, and mtime; supports recursive listing and glob filters |
| `fs_stat` | Retrieve detailed path metadata: size, timestamps, permissions, uid/gid, symlink targets, and xattr names |
| `fs_copy` | Copy a file or directory to a new location |
| `fs_move` | Move or rename a file or directory |
| `fs_make_dir` | Create directories recursively (like `mkdir -p`) |
| `fs_delete` | Delete a path; moves to Trash by default or permanently unlinks |
| `fs_watch_once` | Block until a change is detected in a path, then return changed paths |
| `fs_xattr_get` | Read a macOS extended attribute value, or list all attribute names |
| `fs_xattr_set` | Write a macOS extended attribute (text or base64 encoded) |

> **Note:** All file operations are restricted to paths under `/Users/krishnakanth`.
