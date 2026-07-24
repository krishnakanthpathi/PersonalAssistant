---
type: tool_group
title: MCP Server - native-assistant
description: Integrated MCP server providing tools for native-assistant.
tags: [native-assistant, native, assistant, volume, set, get, active, window, list, applications, open, application, close, iphone, mirror, dark, mode, empty, trash, system, stats, lock, screen, say, speech, power, take, screenshot, notify, prompt, user, date, time, clipboard, read, write, mouse, move, click, drag, scroll, key, press, type, text, keystroke, action, media, control, many, edit, pdf, stat, copy, make, dir, delete, watch, once, xattr, process, run, start, output, input, terminate, kill, shortcut, wait, apps, windows, focus, app, resize, space, mail, calendar, messages, safari, notes, terminal, applescript]
tools: [volume_set, get_volume, get_active_window, list_applications, open_application, close_application, iphone_mirror, set_dark_mode, empty_trash, get_system_stats, lock_screen, say_speech, system_power, take_screenshot, notify, prompt_user, get_date_time, clipboard_read, clipboard_write, mouse_move, mouse_click, mouse_drag, mouse_scroll, key_press, type_text, keystroke_action, media_control, fs_read, fs_read_many, fs_write, fs_edit, fs_write_pdf, fs_list, fs_stat, fs_copy, fs_move, fs_make_dir, fs_delete, fs_watch_once, fs_xattr_get, fs_xattr_set, process_run, process_start, process_read_output, process_write_input, process_terminate, process_list, process_kill, shortcut_list, shortcut_run, wait_ms, list_apps, list_windows, focus_app, focus_window, move_window, resize_window, set_space, mail, calendar, messages, safari, notes, terminal, run_applescript]
timestamp: 2026-07-24T16:39:09.120Z
---

# MCP Server - native-assistant

Integrated MCP server providing tools and capabilities for native-assistant.

### Available Tools

- **`volume_set`**: Sets the macOS system volume to an exact percentage level (0-100).
- **`get_volume`**: Gets the current system output volume level (0-100) on macOS.
- **`get_active_window`**: Gets the application name of the current active focused frontmost window on macOS.
- **`list_applications`**: Lists all GUI applications currently installed on macOS.
- **`open_application`**: Launches or brings to focus a GUI application installed on macOS.
- **`close_application`**: Closes a GUI application running on macOS gracefully.
- **`iphone_mirror`**: iPhone Mirroring launcher: launch or focus the iPhone Mirroring app.
- **`set_dark_mode`**: Sets or toggles macOS dark mode appearance settings.
- **`empty_trash`**: Empties the macOS Trash folder.
- **`get_system_stats`**: Retrieves current macOS system statistics (battery, disk space, and simple CPU/memory status).
- **`lock_screen`**: Locks the macOS screen immediately.
- **`say_speech`**: Speaks the input text aloud using the macOS native speech synthesizer.
- **`system_power`**: Puts the Mac to sleep, restarts it, or shuts it down natively.
- **`take_screenshot`**: Capture a screenshot of the full screen, a specific window, or the iPhone Mirroring window.
- **`notify`**: Post a notification to macOS Notification Center.
- **`prompt_user`**: Show a native popup dialog with an input text box and return the user response.
- **`get_date_time`**: Retrieve the current local date, time, and timezone information from the host system.
- **`clipboard_read`**: Read the system pasteboard as a typed value (string / image / file_urls / rtf).
- **`clipboard_write`**: Write a typed value (string / image / file_urls / rtf) to the system pasteboard.
- **`mouse_move`**: Move the mouse cursor to global screen coordinates (x, y).
- **`mouse_click`**: Click at (x, y) with optional button, count, and modifiers.
- **`mouse_drag`**: Press, drag, and release mouse from (fromX, fromY) to (toX, toY).
- **`mouse_scroll`**: Send a scroll-wheel event in line or pixel units.
- **`key_press`**: Press a single key or shortcut (named key + modifiers) on macOS.
- **`type_text`**: Type a Unicode string into the active input field.
- **`keystroke_action`**: Simulates typing text or pressing specific keyboard shortcut keys on macOS.
- **`media_control`**: Controls playing media tracks (Music/Spotify) on macOS.
- **`fs_read`**: Read a file (UTF-8 text or base64). Cap 10 MB. Access restricted to /Users/krishnakanth.
- **`fs_read_many`**: Batch read up to 50 files / 10 MB total.
- **`fs_write`**: Write a file (text or base64). Cap 50 MB.
- **`fs_edit`**: Find/replace inside a file. Atomic write with optional match count check.
- **`fs_write_pdf`**: Render plain text to a PDF (letter / a4 / legal).
- **`fs_list`**: List directory entries (name, kind, size, mtime). Optional recursive + glob filter.
- **`fs_stat`**: Get path metadata: size, times, permissions, uid/gid, symlink target, and xattr names.
- **`fs_copy`**: Copy a file or directory (both source and destination must be under /Users/krishnakanth).
- **`fs_move`**: Move or rename a file or directory.
- **`fs_make_dir`**: Create a directory recursively.
- **`fs_delete`**: Delete a path. Moves to Trash by default, or unlinks permanently.
- **`fs_watch_once`**: Block until the next change inside a path (or timeout). Returns changed paths.
- **`fs_xattr_get`**: Read a macOS extended attribute (or list all attribute names if name is "*").
- **`fs_xattr_set`**: Write a macOS extended attribute (text or base64).
- **`process_run`**: Run an allow-listed process synchronously (capped output + timeout).
- **`process_start`**: Start an allow-listed process asynchronously, returning a session ID.
- **`process_read_output`**: Read available stdout and stderr from an async process session (non-blocking).
- **`process_write_input`**: Write string to an active process session's standard input.
- **`process_terminate`**: Terminate an async process session (sends SIGTERM, then SIGKILL after 1s if needed).
- **`process_list`**: List running processes on the system (pid, ppid, uid, command). Read-only.
- **`process_kill`**: Send a signal to kill a process PID (refuses PID 1 or cross-user kills by default).
- **`shortcut_list`**: List Apple Shortcuts on this Mac (optional folder filter).
- **`shortcut_run`**: Run an Apple Shortcut by name (optional input/output paths). 60 s timeout.
- **`wait_ms`**: Sleep/wait for N milliseconds (maximum 60000 ms).
- **`list_apps`**: List running GUI applications on macOS (bundle id, name, pid, frontmost).
- **`list_windows`**: List on-screen windows with title, owner app, pid, bounds, and window layer.
- **`focus_app`**: Activate and focus an application by bundle id or name.
- **`focus_window`**: Raise and focus a specific window by its window number ID.
- **`move_window`**: Move a window to (x, y) screen coordinates via Accessibility API.
- **`resize_window`**: Resize a window to (width, height) coordinates via Accessibility API.
- **`set_space`**: Switch to a Mission Control space by index (1-9).
- **`mail`**: Interact with Mail.app: compose outgoing messages, search messages, or list unread inbox messages.
- **`calendar`**: Manage Calendar.app events: create calendar events or list events scheduled for today.
- **`messages`**: Interact with Messages.app: send text messages or list recent buddy conversations.
- **`safari`**: Control Safari browser: open a URL, get open tab details, or execute custom JavaScript on the active tab.
- **`notes`**: Interact with Notes.app: create a new note, search for notes, or append text to an existing note.
- **`terminal`**: Interact with terminal applications (Terminal.app or iTerm2): open windows, run commands, list active sessions.
- **`run_applescript`**: Executes a custom raw AppleScript (osascript) on macOS for advanced automation.
