---
type: tool_group
title: Filesystem Operations & File Management
description: A comprehensive suite of tools for reading, writing, editing, and managing files and directories with support for metadata, extended attributes, and change monitoring.
tags: [filesystem, file, directory, read, write, edit, copy, move, delete, stat, metadata, xattr, extended attributes, watch, monitor, pdf, glob, recursive, tree, list, create, rename, batch, atomic, fs_read, fs_write, fs_edit, fs_list, fs_copy, fs_move, fs_delete, fs_stat, fs_watch, fs_xattr, read_file, write_file, create_directory, list_directory, directory_tree, get_file_info, macOS, trash]
tools: [fs_read, fs_read_many, fs_write, fs_edit, fs_write_pdf, fs_list, fs_stat, fs_copy, fs_move, fs_make_dir, fs_delete, fs_watch_once, fs_xattr_get, fs_xattr_set, read_file, write_file, create_directory, list_directory, list_directory_with_sizes, directory_tree, get_file_info, list_allowed_directories]
timestamp: 2026-07-19T14:36:53.638Z
---

# Filesystem Operations & File Management

The **Filesystem Operations** toolset provides complete file and directory management capabilities within the allowed directories. These tools handle everything from basic file I/O to advanced operations like extended attribute management and change monitoring.

## Core File Operations
- **`fs_read`**: Read a file (UTF-8 text or base64). Cap 10 MB. Access restricted to /Users/krishnakanth.
- **`fs_read_many`**: Batch read up to 50 files / 10 MB total.
- **`fs_write`**: Write a file (text or base64). Cap 50 MB.
- **`fs_edit`**: Find/replace inside a file. Atomic write with optional match count check.
- **`fs_write_pdf`**: Render plain text to a PDF (letter / a4 / legal).

## Directory & Navigation
- **`fs_list`**: List directory entries (name, kind, size, mtime). Optional recursive + glob filter.
- **`fs_stat`**: Get path metadata: size, times, permissions, uid/gid, symlink target, and xattr names.
- **`fs_make_dir`**: Create a directory recursively.
- **`fs_copy`**: Copy a file or directory (both source and destination must be under /Users/krishnakanth).
- **`fs_move`**: Move or rename a file or directory.
- **`fs_delete`**: Delete a path. Moves to Trash by default, or unlinks permanently.

## Extended Attributes & Monitoring
- **`fs_watch_once`**: Block until the next change inside a path (or timeout). Returns changed paths.
- **`fs_xattr_get`**: Read a macOS extended attribute (or list all attribute names if name is "*").
- **`fs_xattr_set`**: Write a macOS extended attribute (text or base64).

## Alternative API Tools
- **`read_file`**: Read the complete contents of a file as text. DEPRECATED: Use read_text_file instead.
- **`write_file`**: Create a new file or completely overwrite an existing file with new content.
- **`create_directory`**: Create a new directory or ensure a directory exists. Can create multiple nested directories.
- **`list_directory`**: Get a detailed listing of all files and directories with [FILE] and [DIR] prefixes.
- **`list_directory_with_sizes`**: Get a detailed listing including file sizes.
- **`directory_tree`**: Get a recursive tree view of files and directories as a JSON structure.
- **`get_file_info`**: Retrieve detailed metadata about a file or directory.
- **`list_allowed_directories`**: Returns the list of directories that this server is allowed to access.
