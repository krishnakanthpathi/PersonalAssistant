---
type: tool_group
title: MCP Server - notion
description: Integrated MCP server providing tools for notion.
tags: [notion, API, get, user, users, self, post, search, block, children, patch, retrieve, update, delete, page, property, comment, create, query, data, source, list, templates, database, move, markdown]
tools: [API-get-user, API-get-users, API-get-self, API-post-search, API-get-block-children, API-patch-block-children, API-retrieve-a-block, API-update-a-block, API-delete-a-block, API-retrieve-a-page, API-patch-page, API-post-page, API-retrieve-a-page-property, API-retrieve-a-comment, API-create-a-comment, API-query-data-source, API-retrieve-a-data-source, API-update-a-data-source, API-create-a-data-source, API-list-data-source-templates, API-retrieve-a-database, API-move-page, API-retrieve-page-markdown, API-update-page-markdown]
timestamp: 2026-07-24T18:10:18.354Z
---

# MCP Server - notion

Integrated MCP server providing tools and capabilities for notion.

### Available Tools

- **`API-get-user`**: Notion | Retrieve a user
Error Responses:
400: 400
- **`API-get-users`**: Notion | List all users
Error Responses:
400: 400
- **`API-get-self`**: Notion | Retrieve your token's bot user
Error Responses:
400: Bad request
- **`API-post-search`**: Notion | Search by title
Error Responses:
400: Bad request
- **`API-get-block-children`**: Notion | Retrieve block children
Error Responses:
400: Bad request
- **`API-patch-block-children`**: Notion | Append block children
Error Responses:
400: Bad request
- **`API-retrieve-a-block`**: Notion | Retrieve a block
Error Responses:
400: Bad request
- **`API-update-a-block`**: Notion | Update a block
Error Responses:
400: Bad request
- **`API-delete-a-block`**: Notion | Delete a block
Error Responses:
400: Bad request
- **`API-retrieve-a-page`**: Notion | Retrieve a page
Error Responses:
400: Bad request
- **`API-patch-page`**: Notion | Update page properties
Error Responses:
400: Bad request
- **`API-post-page`**: Notion | Create a page
Error Responses:
400: Bad request
- **`API-retrieve-a-page-property`**: Notion | Retrieve a page property item
Error Responses:
400: Bad request
- **`API-retrieve-a-comment`**: Notion | Retrieve comments
Error Responses:
400: Bad request
- **`API-create-a-comment`**: Notion | Create comment
Error Responses:
400: Bad request
- **`API-query-data-source`**: Notion | Query a data source
Error Responses:
400: Bad request
- **`API-retrieve-a-data-source`**: Notion | Retrieve a data source
Error Responses:
400: Bad request
- **`API-update-a-data-source`**: Notion | Update a data source
Error Responses:
400: Bad request
- **`API-create-a-data-source`**: Notion | Create a data source
Error Responses:
400: Bad request
- **`API-list-data-source-templates`**: Notion | List templates in a data source
Error Responses:
400: Bad request
- **`API-retrieve-a-database`**: Notion | Retrieve a database
Error Responses:
400: Bad request
- **`API-move-page`**: Notion | Move a page
Error Responses:
400: Bad request
- **`API-retrieve-page-markdown`**: Notion | Retrieve a page as Markdown
Error Responses:
400: Bad request
403: The integration lacks the read/update content capability required for this page.
404: Page not found or not shared with the integration.
429: Rate limited.
- **`API-update-page-markdown`**: Notion | Update a page's content as Markdown
Error Responses:
400: Bad request
403: The integration lacks the read/update content capability required for this page.
404: Page not found or not shared with the integration.
409: Conflict (e.g. row limit exceeded).
429: Rate limited.
