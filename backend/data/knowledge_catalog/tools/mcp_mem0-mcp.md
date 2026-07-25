---
type: tool_group
title: MCP Server - mem0-mcp
description: Integrated MCP server providing tools for mem0-mcp.
tags: [mem0-mcp, mem0, mcp, add, memory, search, memories, list, get, update, delete, history, capabilities, batch, rate, event, events, create, export]
tools: [add_memory, search_memories, search_memory, list_memories, get_memory, update_memory, delete_memory, get_memory_history, get_memory_capabilities, batch_update_memories, batch_delete_memories, rate_memory, get_memory_event, list_memory_events, create_memory_export, get_memory_export]
timestamp: 2026-07-25T05:05:47.031Z
---

# MCP Server - mem0-mcp

Integrated MCP server providing tools and capabilities for mem0-mcp.

### Available Tools

- **`add_memory`**: Stores a piece of text or structural messages as a memory in Mem0.
- **`search_memories`**: Searches stored memories based on a query.
- **`search_memory`**: Backward-compatible alias for search_memories.
- **`list_memories`**: Lists all memories scoped to specific identifiers with pagination.
- **`get_memory`**: Gets a single memory by its ID.
- **`update_memory`**: Updates a specific memory record.
- **`delete_memory`**: Deletes a specific memory record by ID.
- **`get_memory_history`**: Gets the audit trail and revision log of a memory (cloud only).
- **`get_memory_capabilities`**: Returns the features and APIs supported by the current storage mode backend.
- **`batch_update_memories`**: Performs bulk updates of text contents for multiple memories (cloud only).
- **`batch_delete_memories`**: Performs bulk deletions of multiple memories.
- **`rate_memory`**: Submits quality feedback evaluation for a memory record (cloud only).
- **`get_memory_event`**: Manually retrieves detail logs of a specific background event job (cloud only).
- **`list_memory_events`**: Lists history logs of background memory processing events (cloud only).
- **`create_memory_export`**: Kicks off an async memory export query job (cloud only).
- **`get_memory_export`**: Retrieves status and downloads of a memory export job (cloud only).
