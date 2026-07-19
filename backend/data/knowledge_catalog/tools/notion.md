---
type: tool_group
title: Notion API Integration Suite
description: A comprehensive set of tools for interacting with the Notion API to manage users, pages, blocks, databases, comments, and data sources programmatically.
tags: [notion, api, productivity, documentation, knowledge-management, pages, blocks, databases, users, comments, markdown, search, data-source, integration, automation]
tools: [API-get-user, API-get-users, API-get-self, API-post-search, API-get-block-children, API-patch-block-children, API-retrieve-a-block, API-update-a-block, API-delete-a-block, API-retrieve-a-page, API-patch-page, API-post-page, API-retrieve-a-page-property, API-retrieve-a-comment, API-create-a-comment, API-query-data-source, API-retrieve-a-data-source, API-update-a-data-source, API-create-a-data-source, API-list-data-source-templates, API-retrieve-a-database, API-move-page, API-retrieve-page-markdown, API-update-page-markdown]
timestamp: 2026-07-19T14:37:13.278Z
---

# Notion API Integration Suite

This tool group provides a complete interface for the Notion API, enabling automation and programmatic management of Notion workspaces. It covers core entities including users, pages, blocks, databases, and comments.

### User Management
- **`API-get-user`**: Retrieve a specific user.
- **`API-get-users`**: List all users in the workspace.
- **`API-get-self`**: Retrieve your token's bot user information.

### Search & Navigation
- **`API-post-search`**: Search pages and databases by title.

### Block Operations
- **`API-get-block-children`**: Retrieve children of a specific block.
- **`API-patch-block-Children`**: Append new children to a block.
- **`API-retrieve-a-block`**: Retrieve details of a specific block.
- **`API-update-a-block`**: Update properties of a block.
- **`API-delete-a-block`**: Delete a block from the workspace.

### Page Management
- **`API-retrieve-a-page`**: Retrieve details of a specific page.
- **`API-patch-page`**: Update properties of an existing page.
- **`API-post-page`**: Create a new page.
- **`API-retrieve-a-page-property`**: Retrieve a specific property item from a page.
- **`API-move-page`**: Move a page to a new location.

### Markdown Support
- **`API-retrieve-page-markdown`**: Retrieve page content formatted as Markdown.
- **`API-update-page-markdown`**: Update page content using Markdown.

### Database Operations
- **`API-retrieve-a-database`**: Retrieve details of a specific database.

### Data Source Management
- **`API-query-data-source`**: Query a data source.
- **`API-retrieve-a-data-source`**: Retrieve a specific data source.
- **`API-update-a-data-source`**: Update a data source.
- **`API-create-a-data-source`**: Create a new data source.
- **`API-list-data-source-templates`**: List templates available in a data source.

### Comments
- **`API-retrieve-a-comment`**: Retrieve comments from a page or discussion.
- **`API-create-a-comment`**: Add a new comment to a page or discussion.
