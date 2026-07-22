---
type: tool_group
title: Gmail API & Mail Integration Tools
description: Comprehensive tools for managing Gmail drafts, messages, threads, and mailbox monitoring, plus integration with macOS Mail and Messages apps.
tags: [gmail, email, mail, messages, draft, drafts, message, thread, threads, inbox, send, delete, trash, label, labels, mailbox, push, notifications, watch, macos, imessage, text]
tools: [create_draft, delete_draft, get_draft, list_drafts, send_draft, batch_delete_messages, batch_modify_messages, delete_message, get_message, list_messages, modify_message, send_message, trash_message, untrash_message, delete_thread, get_thread, list_threads, modify_thread, trash_thread, untrash_thread, watch_mailbox, stop_mail_watch, mail, messages]
timestamp: 2026-07-21T09:38:53.957Z
---

# Gmail API & Mail Integration Tools

This category provides a complete interface to Gmail's API functionality, enabling full email lifecycle management from draft creation to message deletion.

**Draft Management:**
- `create_draft` — Create a draft email in Gmail (note the mechanics of the raw parameter)
- `delete_draft` — Delete a draft
- `get_draft` — Get a specific draft by ID
- `list_drafts` — List drafts in the user's mailbox
- `send_draft` — Send an existing draft

**Message Operations:**
- `batch_delete_messages` — Delete multiple messages
- `batch_modify_messages` — Modify the labels on multiple messages
- `delete_message` — Immediately and permanently delete a message
- `get_message` — Get a specific message by ID with format options
- `list_messages` — List messages in the user's mailbox with optional filtering
- `modify_message` — Modify the labels on a message
- `send_message` — Send an email message to specified recipients (note the mechanics of the raw parameter)
- `trash_message` — Move a message to the trash
- `untrash_message` — Remove a message from the trash

**Thread Management:**
- `delete_thread` — Delete a thread
- `get_thread` — Get a specific thread by ID
- `list_threads` — List threads in the user's mailbox
- `modify_thread` — Modify the labels applied to a thread
- `trash_thread` — Move a thread to the trash
- `untrash_thread` — Remove a thread from the trash

**Mailbox Monitoring:**
- `watch_mailbox` — Watch for changes to the user's mailbox
- `stop_mail_watch` — Stop receiving push notifications for the given user mailbox

**macOS App Integration:**
- `mail` — Interact with Mail.app: compose outgoing messages, search messages, or list unread inbox messages
- `messages` — Interact with Messages.app: send text messages or list recent buddy conversations
