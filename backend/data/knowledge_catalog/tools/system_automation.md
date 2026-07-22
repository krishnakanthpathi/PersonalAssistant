---
type: tool_group
title: System Automation & Integration Hub
description: Comprehensive suite of tools for knowledge management, system control, GitHub operations, Gmail administration, calendar management, and macOS automation.
tags: [system_automation, knowledge_graph, okf, knowledge_document, github, repository, pull_request, issue, commit, branch, gmail, email, label, filter, forwarding, delegate, send_as, smime, calendar, freebusy, scheduling, macos, volume, dark_mode, screenshot, clipboard, safari, notes, notification, speech, system_power, automation, integration, form_builder, action_card]
tools: [get_knowledge_document, update_knowledge_document, create_prebuilt_form, list-colors, get-freebusy, get-current-time, manage-accounts, create_label, delete_label, get_label, list_labels, patch_label, update_label, get_attachment, get_auto_forwarding, get_imap, get_language, get_pop, get_vacation, update_auto_forwarding, update_imap, update_language, update_pop, update_vacation, add_delegate, remove_delegate, get_delegate, list_delegates, create_filter, delete_filter, get_filter, list_filters, create_forwarding_address, delete_forwarding_address, get_forwarding_address, list_forwarding_addresses, create_send_as, delete_send_as, get_send_as, list_send_as, patch_send_as, update_send_as, verify_send_as, delete_smime_info, get_smime_info, insert_smime_info, list_smime_info, set_default_smime_info, get_profile, create_or_update_file, search_repositories, create_repository, get_file_contents, push_files, create_issue, create_pull_request, fork_repository, create_branch, list_commits, list_issues, update_issue, add_issue_comment, search_code, search_issues, search_users, get_issue, get_pull_request, list_pull_requests, create_pull_request_review, merge_pull_request, get_pull_request_files, get_pull_request_status, update_pull_request_branch, get_pull_request_comments, get_pull_request_reviews, create_entities, create_relations, add_observations, delete_entities, delete_observations, delete_relations, read_graph, search_nodes, open_nodes, volume_set, get_volume, list_applications, open_application, close_application, iphone_mirror, set_dark_mode, get_system_stats, lock_screen, say_speech, system_power, take_screenshot, notify, prompt_user, get_date_time, clipboard_read, clipboard_write, media_control, wait_ms, safari, notes]
timestamp: 2026-07-21T09:38:26.635Z
---

# System Automation & Integration Hub

This category provides a powerful collection of automation and integration tools organized into several functional domains:

### Knowledge Management (OKF)
- **`get_knowledge_document`**: Retrieves complete content and metadata of OKF knowledge documents.
- **`update_knowledge_document`**: Creates or updates structured OKF knowledge documents.
- **`create_prebuilt_form`**: Dynamically creates action cards/form templates for UI execution.

### Knowledge Graph Operations
- **`create_entities`** / **`delete_entities`**: Manage entities in the knowledge graph.
- **`create_relations`** / **`delete_relations`**: Manage relationships between entities.
- **`add_observations`** / **`delete_observations`**: Add or remove entity observations.
- **`read_graph`** / **`search_nodes`** / **`open_nodes`**: Query and navigate the knowledge graph.

### GitHub Integration
- **Repository Management**: `search_repositories`, `create_repository`, `fork_repository`, `create_branch`, `list_commits`
- **File Operations**: `create_or_update_file`, `push_files`, `get_file_contents`, `search_code`
- **Issues**: `create_issue`, `get_issue`, `list_issues`, `update_issue`, `add_issue_comment`, `search_issues`
- **Pull Requests**: `create_pull_request`, `get_pull_request`, `list_pull_requests`, `merge_pull_request`, `create_pull_request_review`, `get_pull_request_files`, `get_pull_request_status`, `update_pull_request_branch`, `get_pull_request_comments`, `get_pull_request_reviews`
- **User Search**: `search_users`

### Gmail Administration
- **Labels**: `create_label`, `delete_label`, `get_label`, `list_labels`, `patch_label`, `update_label`
- **Filters**: `create_filter`, `delete_filter`, `get_filter`, `list_filters`
- **Forwarding**: `create_forwarding_address`, `delete_forwarding_address`, `get_forwarding_address`, `list_forwarding_addresses`
- **Send-As Aliases**: `create_send_as`, `delete_send_as`, `get_send_as`, `list_send_as`, `patch_send_as`, `update_send_as`, `verify_send_as`
- **S/MIME Config**: `delete_smime_info`, `get_smime_info`, `insert_smime_info`, `list_smime_info`, `set_default_smime_info`
- **Settings**: `get_auto_forwarding`, `update_auto_forwarding`, `get_imap`, `update_imap`, `get_pop`, `update_pop`, `get_language`, `update_language`, `get_vacation`, `update_vacation`
- **Delegates**: `add_delegate`, `remove_delegate`, `get_delegate`, `list_delegates`
- **Other**: `get_attachment`, `get_profile`

### Calendar & Scheduling
- **`list-colors`**: Lists color IDs and meanings for calendar events.
- **`get-freebusy`**: Queries free/busy calendar information.
- **`get-current-time`**: Retrieves current date/time for accurate scheduling.
- **`manage-accounts`**: Manages Google account authentication.

### macOS System Control
- **Audio & Visual**: `volume_set`, `get_volume`, `say_speech`, `media_control`
- **Display & Appearance**: `set_dark_mode`, `take_screenshot`
- **Applications**: `list_applications`, `open_application`, `close_application`, `iphone_mirror`
- **System Operations**: `get_system_stats`, `lock_screen`, `system_power`, `get_date_time`, `wait_ms`
- **Input & Output**: `notify`, `prompt_user`, `clipboard_read`, `clipboard_write`
- **Browser & Notes**: `safari`, `notes`
