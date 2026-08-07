---
type: tool_group
title: MCP Server - macsystem-mcp
description: Integrated MCP server providing tools for macsystem-mcp.
tags: [macsystem-mcp, macsystem, mcp, set, volume, get, toggle, dark, mode, system, power, lock, screen, say, speech, stats, wifi, control, date, time, active, window, list, applications, open, application, close, url, apps, windows, focus, app, move, resize, space, keystroke, action, mouse, click, drag, scroll, key, press, type, text, shortcut, run, wait, read, many, write, edit, pdf, stat, copy, mkdir, delete, watch, once, xattr, reveal, finder, selection, tags, quick, look, trash, spotlight, search, empty, process, start, output, input, terminate, kill, media, reminders, timer, applescript, take, screenshot, capture, accessibility, tree, info, clipboard, notify, prompt, user, mail, calendar, messages, safari, notes, terminal, create, contacts, send, draft, iphone, mirror, analyze, image, knowledge, document, update]
tools: [set_volume, get_volume, toggle_dark_mode, system_power, lock_screen, say_speech, get_system_stats, wifi_control, get_date_time, get_active_window, list_applications, open_application, close_application, open_url, list_apps, list_windows, focus_app, focus_window, move_window, resize_window, set_space, keystroke_action, mouse_move, mouse_click, mouse_drag, mouse_scroll, key_press, type_text, shortcut_list, shortcut_run, wait_ms, fs_read, fs_read_many, fs_write, fs_edit, fs_write_pdf, fs_list, fs_stat, fs_copy, fs_move, fs_mkdir, fs_delete, fs_watch_once, fs_xattr_get, fs_xattr_set, reveal_in_finder, get_finder_selection, set_finder_tags, quick_look, move_to_trash, spotlight_search, empty_trash, process_run, process_start, process_read_output, process_write_input, process_terminate, process_list, process_kill, media_control, reminders_action, timer_action, run_applescript, take_screenshot, capture_screen, get_accessibility_tree, get_system_info, get_screen_info, clipboard_action, clipboard_read, clipboard_write, notify, prompt_user, mail, calendar, messages, safari, notes, terminal, calendar_create, contacts_search, notes_create, mail_send_draft, iphone_mirror_info, analyze_image, get_knowledge_document, update_knowledge_document]
timestamp: 2026-08-07T17:23:38.600Z
---

# MCP Server - macsystem-mcp

Integrated MCP server providing tools and capabilities for macsystem-mcp.

### Available Tools

- **`set_volume`**: Sets macOS system volume output level (0 to 100).
- **`get_volume`**: Gets current macOS system volume output level and mute status.
- **`toggle_dark_mode`**: Toggles or sets dark mode on macOS (state: 'on', 'off', or 'toggle').
- **`system_power`**: Triggers system power state action ('sleep', 'restart', 'shutdown', 'logout').
- **`lock_screen`**: Immediately locks the macOS screen.
- **`say_speech`**: Speaks out text aloud using macOS text-to-speech engine.
- **`get_system_stats`**: Returns system CPU usage, memory utilization, disk space, and battery status.
- **`wifi_control`**: Controls Wi-Fi power ('on', 'off', 'status').
- **`get_date_time`**: Retrieve the current local date, time, and timezone information from the host system.
- **`get_active_window`**: Returns the frontmost application process name on macOS.
- **`list_applications`**: Lists names of all currently running application processes with user interfaces.
- **`open_application`**: Launches or brings to front a specified application by name.
- **`close_application`**: Quits a specified application by name.
- **`open_url`**: Opens a URL in the default web browser.
- **`list_apps`**: Lists running applications.
- **`list_windows`**: Lists visible window titles of running applications.
- **`focus_app`**: Focuses/activates a target application.
- **`focus_window`**: Brings window matching title to front.
- **`move_window`**: Moves window of target application to coordinates (x, y).
- **`resize_window`**: Resizes window of target application to dimensions (width, height).
- **`set_space`**: Switches macOS Mission Control desktop space by index.
- **`keystroke_action`**: Performs keyboard automation: 'type' text or press shortcut 'key' with optional 'modifiers'.
- **`mouse_move`**: Moves mouse cursor to (x, y) coordinates.
- **`mouse_click`**: Clicks mouse button at (x, y) coordinates.
- **`mouse_drag`**: Drags mouse from (start_x, start_y) to (end_x, end_y).
- **`mouse_scroll`**: Scrolls mouse wheel by delta_x and delta_y units.
- **`key_press`**: Presses a single key or key combination.
- **`type_text`**: Types text string.
- **`shortcut_list`**: Lists all configured macOS Shortcuts.
- **`shortcut_run`**: Runs a macOS Shortcut by name.
- **`wait_ms`**: Pauses execution for specified milliseconds.
- **`fs_read`**: Reads complete text content of a file.
- **`fs_read_many`**: Reads contents of multiple files at once.
- **`fs_write`**: Writes or overwrites text content to a file.
- **`fs_edit`**: Replaces occurrences of target substring in a file.
- **`fs_write_pdf`**: Writes formatted text to a PDF file.
- **`fs_list`**: Lists files and directories at path.
- **`fs_stat`**: Gets file metadata and statistics.
- **`fs_copy`**: Copies file or directory from src to dst.
- **`fs_move`**: Moves or renames file or directory from src to dst.
- **`fs_mkdir`**: Creates a directory recursively.
- **`fs_delete`**: Deletes a file or directory permanently.
- **`fs_watch_once`**: Monitors path for modification during timeout_sec.
- **`fs_xattr_get`**: Gets macOS extended attribute value of a file.
- **`fs_xattr_set`**: Sets macOS extended attribute value of a file.
- **`reveal_in_finder`**: Reveals file or directory path in macOS Finder.
- **`get_finder_selection`**: Returns file paths currently selected in frontmost Finder window.
- **`set_finder_tags`**: Sets Finder color tags on file path.
- **`quick_look`**: Opens QuickLook preview panel for file path.
- **`move_to_trash`**: Moves file or directory to Trash.
- **`spotlight_search`**: Searches local filesystem via macOS mdfind Spotlight CLI.
- **`empty_trash`**: Empties macOS Trash.
- **`process_run`**: Executes shell command synchronously and returns stdout & stderr.
- **`process_start`**: Launches shell command in background as process.
- **`process_read_output`**: Reads available stdout/stderr output from background process PID.
- **`process_write_input`**: Writes stdin input data to background process PID.
- **`process_terminate`**: Gracefully terminates process PID.
- **`process_list`**: Lists running processes with PID, name, CPU %, and memory usage.
- **`process_kill`**: Forcefully kills process PID (SIGKILL).
- **`media_control`**: Controls media playback ('play', 'pause', 'playpause', 'next', 'previous').
- **`reminders_action`**: Manages macOS Reminders app ('list', 'create', 'complete').
- **`timer_action`**: Sets or manages timers ('set', 'cancel').
- **`run_applescript`**: Executes arbitrary AppleScript automation code on macOS.
- **`take_screenshot`**: Takes a screenshot of the main screen and saves to file path.
- **`capture_screen`**: Captures screen image.
- **`get_accessibility_tree`**: Returns accessibility tree hierarchy of application window.
- **`get_system_info`**: Returns macOS operating system hardware & build info.
- **`get_screen_info`**: Returns main display resolution and pixel density info.
- **`clipboard_action`**: Reads or sets macOS clipboard text ('read', 'write', 'copy').
- **`clipboard_read`**: Reads string content from clipboard.
- **`clipboard_write`**: Sets string content into clipboard.
- **`notify`**: Displays a macOS system banner notification.
- **`prompt_user`**: Displays an interactive modal alert prompt and returns user choice.
- **`mail`**: Interact with macOS Mail app: 'read_inbox', 'read_message', 'send_draft', or 'search'.
- **`calendar`**: Interact with macOS Calendar app: 'list_events', 'create_event', or 'delete_event'.
- **`messages`**: Interact with iMessage/Messages app: 'send' or 'read_recent'.
- **`safari`**: Interact with Safari app: 'open_url', 'get_active_tab', 'list_open_tabs', or 'run_js_on_active_tab'.
- **`notes`**: Interact with Notes.app: 'create', 'search', or 'append'.
- **`terminal`**: Interact with terminal applications (Terminal.app or iTerm2): 'open_window', 'run_command', 'send_text', 'get_active_text', or 'list_sessions'.
- **`calendar_create`**: Creates a new event in macOS Calendar app.
- **`contacts_search`**: Searches macOS Contacts app for person matching query.
- **`notes_create`**: Creates a new note in macOS Notes app.
- **`mail_send_draft`**: Creates a new draft message in macOS Mail app.
- **`iphone_mirror_info`**: Returns macOS iPhone Mirroring connectivity status.
- **`analyze_image`**: Analyzes image file and returns dimension & format metadata.
- **`get_knowledge_document`**: Retrieves document from local knowledge catalog by ID.
- **`update_knowledge_document`**: Updates or creates document in local knowledge catalog by ID.
