---
type: tool_group
title: Filesystem Operations & File Management
description: A comprehensive suite of tools for file and directory manipulation including reading, writing, copying, moving, deleting, and monitoring filesystem resources.
tags: [filesystem, files, directories, read, write, copy, move, delete, directory-tree, file-info, metadata, watch, xattr, extended-attributes, pdf, batch-read, edit, create-directory, list-directory, allowed-directories, macOS]
tools: [read_file, write_file, create_directory, list_directory, list_directory_with_sizes, directory_tree, get_file_info, list_allowed_directories, fs_read, fs_read_many, fs_write, fs_edit, fs_write_pdf, fs_list, fs_stat, fs_copy, fs_move, fs_make_dir, fs_delete, fs_watch_once, fs_xattr_get, fs_xattr_set]
timestamp: 2026-08-01T09:34:17.053Z
---

# Filesystem Operations & File Management

This tool group provides complete filesystem management capabilities, enabling safe and efficient file operations within allowed directories. The tools are organized into several functional categories:

### Core File Operations
- **`read_file`**: Read the complete contents of a file as text. *DEPRECATED: Use read_text_file instead.*
- **`write_file`**: Create a new file or completely overwrite an existing file with new content.
- **`fs_read`**: Read a file (UTF-8 text or base64). Cap 10 MB.
- **`fs_read_many`**: Batch read up to 50 files / 10 MB total.
- **`fs_write`**: Write a file (text or base64). Cap 50 MB.
- **`fs_edit`**: Find/replace inside a file with atomic write and optional match count check.
- **`fs_write_pdf`**: Render plain text to a PDF (letter / a4 / legal).

### Directory Operations
- **`create_directory`**: Create a new directory or ensure a directory exists with nested path support.
- **`fs_make_dir`**: Create a directory recursively.
- **`list_directory`**: Get a detailed listing of files and directories with [FILE] and [DIR] prefixes.
- **`list_directory_with_sizes`**: List directory contents including file sizes.
- **`directory_tree`**: Get a recursive tree view of files and directories as a JSON structure.
- **`fs_list`**: List directory entries with optional recursive mode and glob filter.

### File Management
- **`fs_copy`**: Copy a file or directory.
- **`fs_move`**: Move or rename a file or directory.
- **`fs_delete`**: Delete a path (moves to Trash by default or permanent unlink).

### Metadata & Information
- **`get_file_info`**: Retrieve detailed metadata including size, timestamps, and permissions.
- **`fs_stat`**: Get comprehensive path metadata: size, times, permissions, uid/gid, symlink target, and xattr names.
- **`list_allowed_directories`**: Returns the list of directories that this server is allowed to access.

### Monitoring & Extended Attributes (macOS)
- **`fs_watch_once`**: Block until the next change inside a path (or timeout).
- **`fs_xattr_get`**: Read a macOS extended attribute.
- **`fs_xattr_set`**: Write a macOS extended attribute.
