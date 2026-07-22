---
type: tool_group
title: Notion API Integration Suite
description: A comprehensive set of tools for interacting with the Notion API to manage users, pages, blocks, databases, data sources, and comments.
tags: [notion, api, productivity, workspace, database, page, block, user, comment, data-source, markdown, search, create, update, delete, retrieve, list, query]
tools: [API-get-user, API-get-users, API-get-self, API-post-search, API-get-block-children, API-patch-block-children, API-retrieve-a-block, API-update-a-block, API-delete-a-block, API-retrieve-a-page, API-patch-page, API-post-page, API-retrieve-a-page-property, API-retrieve-a-comment, API-create-a-comment, API-query-data-source, API-retrieve-a-data-source, API-update-a-data-source, API-create-a-data-source, API-list-data-source-templates, API-retrieve-a-database, API-move-page, API-retrieve-page-markdown, API-update-page-markdown]
timestamp: 2026-07-21T09:38:34.030Z
---

# Notion API Integration Suite

This tool group provides a complete interface to the Notion API, enabling programmatic control over workspace elements. It covers user management, content creation and modification, database operations, and more.

### Available Tools

**User Management**
- **`API-get-user`**: Retrieve a specific user.
- **`API-get-users`**: List all users in the workspace.
- **`API-get-self`**: Retrieve your token's bot user details.

**Search**
- **`API-post-search`**: Search pages and databases by title.

**Blocks**
- **`API-get-block-children`**: Retrieve children of a specific block.
- **`API-patch-block-children`**: Append new children to a block.
- **`API-retrieve-a-block`**: Retrieve details of a specific block.
- **`API-update-a-block`**: Update the content or properties of a block.
- **`API-delete-a-block`**: Delete a specific block.

**Pages**
- **`API-retrieve-a-page`**: Retrieve a specific page.
- **`API-patch-page`**: Update properties of a page.
- **`API-post-page`**: Create a new page.
- **`API-retrieve-a-page-property`**: Retrieve a specific property item from a page.
- **`API-move-page`**: Move a page to a new location.
- **`API-retrieve-page-markdown`**: Retrieve a page's content formatted as Markdown.
- **`API-update-page-markdown`**: Update a page's content using Markdown.

**Databases & Data Sources**
- **`API-retrieve-a-database`**: Retrieve a specific database.
- **`API-query-data-source`**: Query a data source for items.
- **`API-retrieve-a-data-source`**: Retrieve details of a data source.
- **`API-update-a-data-source`**: Update a data source.
- **`API-create-a-data-source`**: Create a new data source.
- **`API-list-data-source-templates`**: List templates available in a data source.

**Comments**
- **`API-retrieve-a-comment`**: Retrieve comments on a page or block.
- **`API-create-a-comment`**: Add a new comment to a page or discussion.
