---
type: tool_group
title: MCP Server - gmail
description: Integrated MCP server providing tools for gmail.
tags: [gmail, create, draft, delete, get, list, drafts, send, label, labels, patch, update, batch, messages, modify, message, trash, untrash, attachment, thread, threads, auto, forwarding, imap, language, pop, vacation, add, delegate, remove, delegates, filter, filters, address, addresses, verify, smime, info, insert, set, default, profile, watch, mailbox, stop, mail]
tools: [create_draft, delete_draft, get_draft, list_drafts, send_draft, create_label, delete_label, get_label, list_labels, patch_label, update_label, batch_delete_messages, batch_modify_messages, delete_message, get_message, list_messages, modify_message, send_message, trash_message, untrash_message, get_attachment, delete_thread, get_thread, list_threads, modify_thread, trash_thread, untrash_thread, get_auto_forwarding, get_imap, get_language, get_pop, get_vacation, update_auto_forwarding, update_imap, update_language, update_pop, update_vacation, add_delegate, remove_delegate, get_delegate, list_delegates, create_filter, delete_filter, get_filter, list_filters, create_forwarding_address, delete_forwarding_address, get_forwarding_address, list_forwarding_addresses, create_send_as, delete_send_as, get_send_as, list_send_as, patch_send_as, update_send_as, verify_send_as, delete_smime_info, get_smime_info, insert_smime_info, list_smime_info, set_default_smime_info, get_profile, watch_mailbox, stop_mail_watch]
timestamp: 2026-07-22T16:48:51.312Z
---

# MCP Server - gmail

Integrated MCP server providing tools and capabilities for gmail.

### Available Tools

- **`create_draft`**: Create a draft email in Gmail. Note the mechanics of the raw parameter.
- **`delete_draft`**: Delete a draft
- **`get_draft`**: Get a specific draft by ID
- **`list_drafts`**: List drafts in the user's mailbox
- **`send_draft`**: Send an existing draft
- **`create_label`**: Create a new label
- **`delete_label`**: Delete a label
- **`get_label`**: Get a specific label by ID
- **`list_labels`**: List all labels in the user's mailbox
- **`patch_label`**: Patch an existing label (partial update)
- **`update_label`**: Update an existing label
- **`batch_delete_messages`**: Delete multiple messages
- **`batch_modify_messages`**: Modify the labels on multiple messages
- **`delete_message`**: Immediately and permanently delete a message
- **`get_message`**: Get a specific message by ID with format options
- **`list_messages`**: List messages in the user's mailbox with optional filtering
- **`modify_message`**: Modify the labels on a message
- **`send_message`**: Send an email message to specified recipients. Note the mechanics of the raw parameter.
- **`trash_message`**: Move a message to the trash
- **`untrash_message`**: Remove a message from the trash
- **`get_attachment`**: Get a message attachment
- **`delete_thread`**: Delete a thread
- **`get_thread`**: Get a specific thread by ID
- **`list_threads`**: List threads in the user's mailbox
- **`modify_thread`**: Modify the labels applied to a thread
- **`trash_thread`**: Move a thread to the trash
- **`untrash_thread`**: Remove a thread from the trash
- **`get_auto_forwarding`**: Gets auto-forwarding settings
- **`get_imap`**: Gets IMAP settings
- **`get_language`**: Gets language settings
- **`get_pop`**: Gets POP settings
- **`get_vacation`**: Get vacation responder settings
- **`update_auto_forwarding`**: Updates automatic forwarding settings
- **`update_imap`**: Updates IMAP settings
- **`update_language`**: Updates language settings
- **`update_pop`**: Updates POP settings
- **`update_vacation`**: Update vacation responder settings
- **`add_delegate`**: Adds a delegate to the specified account
- **`remove_delegate`**: Removes the specified delegate
- **`get_delegate`**: Gets the specified delegate
- **`list_delegates`**: Lists the delegates for the specified account
- **`create_filter`**: Creates a filter
- **`delete_filter`**: Deletes a filter
- **`get_filter`**: Gets a filter
- **`list_filters`**: Lists the message filters of a Gmail user
- **`create_forwarding_address`**: Creates a forwarding address
- **`delete_forwarding_address`**: Deletes the specified forwarding address
- **`get_forwarding_address`**: Gets the specified forwarding address
- **`list_forwarding_addresses`**: Lists the forwarding addresses for the specified account
- **`create_send_as`**: Creates a custom send-as alias
- **`delete_send_as`**: Deletes the specified send-as alias
- **`get_send_as`**: Gets the specified send-as alias
- **`list_send_as`**: Lists the send-as aliases for the specified account
- **`patch_send_as`**: Patches the specified send-as alias
- **`update_send_as`**: Updates a send-as alias
- **`verify_send_as`**: Sends a verification email to the specified send-as alias
- **`delete_smime_info`**: Deletes the specified S/MIME config for the specified send-as alias
- **`get_smime_info`**: Gets the specified S/MIME config for the specified send-as alias
- **`insert_smime_info`**: Insert (upload) the given S/MIME config for the specified send-as alias
- **`list_smime_info`**: Lists S/MIME configs for the specified send-as alias
- **`set_default_smime_info`**: Sets the default S/MIME config for the specified send-as alias
- **`get_profile`**: Get the current user's Gmail profile
- **`watch_mailbox`**: Watch for changes to the user's mailbox
- **`stop_mail_watch`**: Stop receiving push notifications for the given user mailbox
