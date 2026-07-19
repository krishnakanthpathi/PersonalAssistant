---
type: tool_group
title: Gmail Email Management & Messaging Tools
description: A comprehensive suite of tools for managing Gmail messages, labels, and mailbox monitoring through programmatic API interactions.
tags: [gmail, email, mail, messages, send, compose, inbox, delete, trash, labels, modify, watch, mailbox, batch, notifications, push]
tools: [mail, messages, batch_delete_messages, batch_modify_messages, delete_message, get_message, list_messages, modify_message, send_message, trash_message, untrash_message, watch_mailbox, stop_mail_watch]
timestamp: 2026-07-19T14:37:02.138Z
---

# Gmail Email Management & Messaging Tools

These tools provide complete programmatic access to Gmail mailbox operations, enabling message retrieval, composition, organization, and real-time monitoring. The toolset supports both individual and batch operations for efficient workflow management.

**Available Tools:**

- **`mail`**: Interact with Mail.app: compose outgoing messages, search messages, or list unread inbox messages.
- **`messages`**: Interact with Messages.app: send text messages or list recent buddy conversations.
- **`batch_delete_messages`**: Delete multiple messages
- **`batch_modify_messages`**: Modify the labels on multiple messages
- **`delete_message`**: Immediately and permanently delete a message
- **`get_message`**: Get a specific message by ID with format options
- **`list_messages`**: List messages in the user's mailbox with optional filtering
- **`modify_message`**: Modify the labels on a message
- **`send_message`**: Send an email message to specified recipients. Note the mechanics of the raw parameter.
- **`trash_message`**: Move a message to the trash
- **`untrash_message`**: Remove a message from the trash
- **`watch_mailbox`**: Watch for changes to the user's mailbox
- **`stop_mail_watch`**: Stop receiving push notifications for the given user mailbox
