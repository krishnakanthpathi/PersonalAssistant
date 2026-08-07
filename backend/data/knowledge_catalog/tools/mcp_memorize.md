---
type: tool_group
title: MCP Server - memorize
description: Integrated MCP server providing tools for memory storage, remembering notes and preferences, recalling info, saving, and searching memories.
tags: [memorize, upsert, memory, store, append, update, smart, read, delete, clear, all, memories, list, get, file, status, sync, markdown, files, hybrid, search, auto, classify, categories, add, category, peek, vector, chunks, available, models, organize, remember, recall, save, note, notes, forget, retrieve, know, preference, preferences, knowledge, find, lookup, keep, mind]
tools: [upsert_memory, store_memory, append_memory, update_memory, smart_upsert_memory, read_memory, delete_memory, clear_all_memories, list_memories, get_memory_file_status, sync_markdown_files, hybrid_search_memories, search_memory, auto_classify_memory, get_categories, add_category, delete_category, peek_vector_db_chunks, list_available_models, organize_memory_files]
timestamp: 2026-08-07T17:23:38.539Z
---

# MCP Server - memorize

Integrated MCP server providing tools and capabilities for memorize.

### Available Tools

- **`upsert_memory`**: 
Unified memory lifecycle tool to Insert, Update, Append, or Delete memories.
Normalizes title strings, prevents filename duplication, and appends to existing files seamlessly.

- **`store_memory`**: 
Stores memory into system. Automatically updates/appends if topic already exists.

- **`append_memory`**: 
Helper tool for upsert_memory to explicitly append new content to an existing memory.
Creates a new memory if no matching title/memory_id is found.

- **`update_memory`**: 
Helper tool for upsert_memory to explicitly update/overwrite an existing memory's content.

- **`smart_upsert_memory`**: 
Smart helper tool for upsert_memory that automatically classifies category and extracts tags
if they are not provided, before saving.

- **`read_memory`**: 
Fetches frontmatter metadata, tags, and full content for a given Memory ID.

- **`delete_memory`**: 
Deletes a memory across Markdown disk storage, SQLite database, and ChromaDB vector store.

- **`clear_all_memories`**: 
Completely purges all memories from disk, resets SQLite database,
and clears ChromaDB vector database store.

- **`list_memories`**: 
Lists stored memories from SQLite with optional filtering by category or tag.

- **`get_memory_file_status`**: 
Checks and returns the exact status of a Markdown file (existence, full text,
frontmatter metadata, estimated tokens, content hash, and sync state).

- **`sync_markdown_files`**: 
Scans data/memories/ for Markdown files added, updated, or deleted on disk,
automatically chunking, embedding, and updating SQLite + ChromaDB.

- **`hybrid_search_memories`**: 
Performs hybrid weighted relevance search combining Vector Similarity (50%),
Tag Match (30%), and Category Match (20%) to return ranked top memories.

- **`search_memory`**: 
Performs pure similarity search using vector embeddings to find and rank memories based on query similarity.

- **`auto_classify_memory`**: 
Analyzes raw text, automatically assigns a category, and extracts relevant tags.

- **`get_categories`**: 
Returns all currently available memory categories on disk.

- **`add_category`**: 
Dynamically creates category storage directory.

- **`delete_category`**: 
Deletes a category directory on disk and purges category records from SQLite.

- **`peek_vector_db_chunks`**: 
Inspects stored vector chunks in ChromaDB.

- **`list_available_models`**: 
Fetches available models and bifurcates into embedding vs generative models.

- **`organize_memory_files`**: 
Audits and reorganizes memory Markdown files into their correct category folders,
slugifies filenames, cleans empty directories, and refreshes indexes.

