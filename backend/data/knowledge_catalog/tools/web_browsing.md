---
type: tool_group
title: Web Browsing & Content Extraction
description: Comprehensive web interaction tools for searching, scraping, crawling, monitoring, and extracting structured data from websites and research papers.
tags: [web, browsing, scraping, crawling, search, firecrawl, extraction, monitoring, research, papers, agent, interact, parse, feedback]
tools: [firecrawl_scrape, firecrawl_map, firecrawl_search, firecrawl_search_feedback, firecrawl_feedback, firecrawl_crawl, firecrawl_check_crawl_status, firecrawl_extract, firecrawl_agent, firecrawl_agent_status, firecrawl_interact, firecrawl_interact_stop, firecrawl_parse, firecrawl_monitor_create, firecrawl_monitor_list, firecrawl_monitor_get, firecrawl_monitor_update, firecrawl_monitor_delete, firecrawl_monitor_run, firecrawl_monitor_checks, firecrawl_monitor_check, firecrawl_research_search_papers, firecrawl_research_inspect_paper, firecrawl_research_related_papers, firecrawl_research_read_paper, firecrawl_research_search_github]
timestamp: 2026-07-21T09:38:47.576Z
---

# Web Browsing & Content Extraction

This category provides a complete toolkit for web-based research and data extraction powered by Firecrawl. Core capabilities include:

- **Single-page extraction**: `firecrawl_scrape` for powerful content extraction from known URLs (supports markdown, JSON with schemas, and branding formats)
- **Site discovery**: `firecrawl_map` to discover URLs on a website before scraping
- **Web search**: `firecrawl_search` for finding information across the web with advanced operators and optional content extraction
- **Multi-page crawling**: `firecrawl_crawl` for comprehensive extraction from multiple related pages
- **Structured extraction**: `firecrawl_extract` for LLM-powered structured data extraction from multiple pages
- **Autonomous research**: `firecrawl_agent` for complex multi-source research tasks with async polling via `firecrawl_agent_status`
- **Interactive browsing**: `firecrawl_interact` for clicking, form-filling, and navigating dynamic pages
- **Document parsing**: `firecrawl_parse` for extracting content from local files (PDF, Word, Excel, HTML)
- **Change monitoring**: `firecrawl_monitor_create`, `_list`, `_get`, `_update`, `_delete`, `_run`, `_checks`, `_check` for creating and managing recurring monitors with diff-based change detection
- **Research papers**: `firecrawl_research_search_papers`, `_inspect_paper`, `_related_papers`, `_read_paper`, `_search_github` for academic and technical literature discovery
- **Feedback**: `firecrawl_search_feedback` and `firecrawl_feedback` for quality improvement and credit refunds
