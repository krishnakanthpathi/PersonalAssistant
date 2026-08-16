---
type: tool_group
title: MCP Server - memorize
description: Integrated MCP server providing tools for memory storage, remembering notes and preferences, recalling info, saving, and searching memories.
tags: [memorize, store, update, delete, fetch, hybrid, list, memories, get, categories, remember, recall, save, note, notes, forget, retrieve, know, preference, preferences, knowledge, find, lookup, keep, mind, memory]
tools: [store, update, delete, fetch, hybrid_fetch, list_memories, get_categories]
timestamp: 2026-08-16T14:38:17.677Z
---

# MCP Server - memorize

Integrated MCP server providing tools and capabilities for memorize.

### Available Tools

- **`store`**: 
Stores knowledge into the Memorize knowledge base. Automatically creates a new note or appends to an existing topic.

CRITICAL INSTRUCTION FOR LLM:
If the user does NOT explicitly provide a category, YOU MUST choose the single best matching category from this predefined taxonomy:

1. 'personal': Daily life, habits, health, sleep, diary, contacts, personal preferences, lifestyle.
2. 'development': Programming languages, frameworks (React, FastAPI, Python, TypeScript), code snippets, algorithms, dev tools, CSS/UI, debugging.
3. 'projects': Application builds, side projects, product specs, MVPs, feature roadmaps, system designs.
4. 'job': Career, resume, employment history, company projects, interviews, work achievements, salary.
5. 'education': College/university, study notes, degrees, exam prep, academic research, courses.
6. 'finance': Budget, expenses, investments, stock portfolio, crypto, bank accounts, taxes.
7. 'gaming': Video games, game lore, strategies, game achievements, Steam/console gaming.
8. 'achievements': Exam ranks, awards, prizes, certifications, hackathon wins, major milestones.
9. 'integration': MCP server configs, APIs, webhooks, SSH, WSL, cloud infrastructure, OAuth.
10. 'media': Books, movies, podcasts, YouTube playlists, reading summaries, audio/video notes.
11. 'others': General miscellaneous reference notes.

Args:
    title: Title or subject of the memory (e.g., 'Python Async Best Practices', 'Investment Portfolio 2026')
    content: Detailed Markdown body content
    category: Category name strictly chosen from the taxonomy above (defaults to 'personal')
    tags: Optional list of 2-5 concise descriptive tags (e.g. ['python', 'async', 'backend'])
    memory_id: Optional explicit memory ID

- **`update`**: 
Updates an existing memory's content. Overwrites, cleanly merges, or appends new information.

Categories:
'personal', 'development', 'projects', 'job', 'education', 'finance', 'gaming', 'achievements', 'integration', 'media', 'others'.

Args:
    title: Title or subject of the memory to update
    content: New content or update to apply
    category: Category folder name (strictly one of the 11 categories)
    tags: Optional list of updated tags
    memory_id: Optional memory ID to target
    append: If True, appends content to the end of the note rather than updating/merging

- **`delete`**: 
Deletes a memory across disk Markdown storage, SQLite database index, and ChromaDB vector store.

Args:
    memory_id: The unique ID of the memory to delete (e.g. 'mem_abc123')
    title: Optional title of the memory if memory_id is unknown
    category: Category name where the note is stored (default 'personal')

- **`fetch`**: 
Fetches full memory metadata and markdown content for a specific ID/title, or lists stored memories.

Available category filters:
'personal', 'development', 'projects', 'job', 'education', 'finance', 'gaming', 'achievements', 'integration', 'media', 'others'.

Args:
    memory_id: Specific memory ID to retrieve
    title: Specific title to retrieve if memory_id is unknown
    category_filter: Optional category restriction to filter listed memories
    tag_filter: Optional tag restriction to filter listed memories

- **`hybrid_fetch`**: 
Performs 50/30/20 weighted hybrid RAG search across memories combining Vector Similarity (50%),
Tag Match (30%), and Category Match (20%).

Category filter can be any of:
'personal', 'development', 'projects', 'job', 'education', 'finance', 'gaming', 'achievements', 'integration', 'media', 'others'.

Args:
    query: Natural language search query or question
    category_filter: Optional category restriction
    top_k: Number of ranked memories to retrieve (default 5)

- **`list_memories`**: 
Lists stored memories with optional category or tag filtering.
Returns structured summaries of memories including ID, title, category, tags, and timestamps.

Available category filters:
'personal', 'development', 'projects', 'job', 'education', 'finance', 'gaming', 'achievements', 'integration', 'media', 'others'.

Args:
    category_filter: Optional category restriction
    tag_filter: Optional tag restriction
    limit: Optional maximum number of memories to return

- **`get_categories`**: 
Returns all 11 standard predefined memory categories along with descriptions
and the count of notes currently stored in each category.

Categories:
- 'personal': Habits, daily routines, diary, thoughts, health, sleep, preferences, contacts, family, lifestyle.
- 'development': Programming languages (Python, TypeScript, JS, Rust, Go, C++), frameworks (React, FastAPI, Node), code snippets, algorithms, bug fixes, UI/CSS, git.
- 'projects': Specific software applications, side projects, product ideas, roadmaps, architecture blueprints, feature specs.
- 'job': Career history, work experience, resume, employment, interviews, salary, workplace projects, company tasks.
- 'education': University/college courses, degrees, study notes, academic research, computer science concepts, exam prep.
- 'finance': Personal budget, expenses, investments, stocks, crypto, banking, tax planning, financial goals.
- 'gaming': Video games, strategies, achievements, platforms (Steam, PlayStation, Xbox, Nintendo), esports.
- 'achievements': Competitive exam ranks (JEE, SAT), awards, honors, hackathons, tournament prizes, milestone certifications.
- 'integration': MCP servers, API endpoints, webhooks, cloud setup, Tailscale, WSL, Linux server configs, OAuth, CI/CD.
- 'media': Books, podcasts, audio, video, movies, reading lists, YouTube channels, OCR document scans.
- 'others': Miscellaneous or temporary reference information that does not fit the above categories.

