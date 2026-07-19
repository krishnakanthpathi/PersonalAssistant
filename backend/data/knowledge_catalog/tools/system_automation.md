---
type: tool_group
title: macOS System Automation & Integration Hub
description: A comprehensive suite of tools for automating macOS system operations, managing applications, controlling hardware, integrating with cloud services, and interacting with the local file system.
tags: [system_automation, macos, volume, applications, screenshot, clipboard, media_control, dark_mode, power, timer, reminders, notes, safari, terminal, notifications, file_system, knowledge_graph, gmail, github, calendar, ffmpeg, iphone_mirror, open_url, lock_screen, system_stats, analyze_image]
tools: [volume_set, list_applications, open_application, take_screenshot, close_application, open_url, get_system_stats, lock_screen, get_volume, clipboard_action, media_control, set_dark_mode, system_power, mac_timer, mac_reminders, analyze_image, get_knowledge_document, update_knowledge_document, wait_ms, clipboard_read, clipboard_write, notify, prompt_user, safari, notes, terminal, iphone_mirror, read_text_file, read_media_file, read_multiple_files, edit_file, move_file, search_files, list-colors, get-freebusy, get-current-time, manage-accounts, create_draft, delete_draft, get_draft, list_drafts, send_draft, create_label, delete_label, get_label, list_labels, patch_label, update_label, get_attachment, delete_thread, get_thread, list_threads, modify_thread, get_auto_forwarding, get_imap, get_language, get_pop, get_vacation, update_auto_forwarding, update_imap, update_language, update_pop, update_vacation, add_delegate, remove_delegate, get_delegate, list_delegates, create_filter, delete_filter, get_filter, list_filters, create_forwarding_address, delete_forwarding_address, get_forwarding_address, list_forwarding_addresses, create_send_as, delete_send_as, get_send_as, list_send_as, patch_send_as, update_send_as, verify_send_as, delete_smime_info, get_smime_info, insert_smime_info, list_smime_info, set_default_smime_info, get_profile, create_or_update_file, search_repositories, create_repository, get_file_contents, push_files, create_issue, create_pull_request, fork_repository, create_branch, list_commits, list_issues, update_issue, add_issue_comment, search_code, search_issues, search_users, get_issue, get_pull_request, list_pull_requests, create_pull_request_review, merge_pull_request, get_pull_request_files, get_pull_request_status, update_pull_request_branch, get_pull_request_comments, get_pull_request_reviews, create_entities, create_relations, add_observations, delete_entities, delete_observations, delete_relations, read_graph, search_nodes, open_nodes, check_ffmpeg_installed, convert_video, get_supported_formats]
timestamp: 2026-07-19T14:36:28.077Z
---

# macOS System Automation & Integration Hub

This category encompasses a wide range of automation capabilities for macOS and external service integrations.

### macOS System Control
- **`volume_set`** / **`get_volume`**: Set or retrieve system output volume levels.
- **`set_dark_mode`**: Toggle or set macOS dark mode appearance.
- **`lock_screen`**: Immediately lock the macOS screen.
- **`system_power`**: Sleep, restart, or shut down the Mac.
- **`get_system_stats`**: Retrieve battery, disk space, and CPU/memory status.

### Application Management
- **`list_applications`**: List all installed GUI applications.
- **`open_application`** / **`close_application`**: Launch, focus, or close GUI applications.
- **`take_screenshot`**: Capture screenshots of the screen or windows.
- **`media_control`**: Control media playback (Music/Spotify).
- **`mac_timer`**: Manage native macOS Clock app timers.
- **`mac_reminders`**: Interact with macOS Reminders app.
- **`notes`**: Create, search, or append to Apple Notes.
- **`safari`**: Control Safari browser, tabs, and execute JavaScript.
- **`terminal`**: Interact with Terminal.app or iTerm2.
- **`iphone_mirror`**: Launch or focus iPhone Mirroring.

### Clipboard & Input
- **`clipboard_action`** / **`clipboard_read`** / **`clipboard_write`**: Get, set, or manipulate system clipboard contents.
- **`prompt_user`**: Show a native dialog for user input.
- **`notify`**: Post notifications to macOS Notification Center.

### File System Operations
- **`read_text_file`** / **`read_media_file`** / **`read_multiple_files`**: Read file contents in various formats.
- **`edit_file`**: Make line-based edits to text files.
- **`move_file`**: Move or rename files and directories.
- **`search_files`**: Recursively search for files using glob patterns.
- **`create_or_update_file`**: Create or update files in repositories.

### Knowledge Graph & OKF
- **`analyze_image`**: Analyze images using vision models.
- **`get_knowledge_document`** / **`update_knowledge_document`**: Manage OKF knowledge documents.
- **`create_entities`**, **`create_relations`**, **`search_nodes`**, etc.: Manage knowledge graph data.

### External Service Integrations
- **Gmail**: Drafts, labels, threads, filters, delegates, S/MIME, and settings management.
- **GitHub**: Repositories, issues, pull requests, branches, commits, and code search.
- **Calendar**: Free/busy queries, colors, and time management.

### Media Processing
- **`check_ffmpeg_installed`**: Verify FFmpeg installation.
- **`convert_video`**: Convert video files between formats.
- **`get_supported_formats`**: List supported media formats.

### Utilities
- **`open_url`**: Open web URLs in the default browser.
- **`wait_ms`**: Sleep for a specified duration.
