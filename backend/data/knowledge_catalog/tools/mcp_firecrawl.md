---
type: tool_group
title: MCP Server - firecrawl
description: Integrated MCP server providing tools for firecrawl.
tags: [firecrawl, scrape, map, search, feedback, crawl, check, status, extract, agent, interact, stop, parse, monitor, create, list, get, update, delete, run, checks, research, papers, inspect, paper, related, read, github, developer]
tools: [firecrawl_scrape, firecrawl_map, firecrawl_search, firecrawl_search_feedback, firecrawl_feedback, firecrawl_crawl, firecrawl_check_crawl_status, firecrawl_extract, firecrawl_agent, firecrawl_agent_status, firecrawl_interact, firecrawl_interact_stop, firecrawl_parse, firecrawl_monitor_create, firecrawl_monitor_list, firecrawl_monitor_get, firecrawl_monitor_update, firecrawl_monitor_delete, firecrawl_monitor_run, firecrawl_monitor_checks, firecrawl_monitor_check, firecrawl_research_search_papers, firecrawl_research_inspect_paper, firecrawl_research_related_papers, firecrawl_research_read_paper, firecrawl_research_search_github, firecrawl_developer_search]
timestamp: 2026-08-07T14:07:40.163Z
---

# MCP Server - firecrawl

Integrated MCP server providing tools and capabilities for firecrawl.

### Available Tools

- **`firecrawl_scrape`**: 
Retrieve and extract content from one supplied URL through Firecrawl. Use this when the request identifies a page and needs its content or defined fields. It can return markdown, HTML, links, screenshots, branding data, a targeted answer, or JSON matching a supplied schema; JSON is useful when the requested result has defined fields, while markdown preserves readable page content.

This tool operates on a known page. For a set of pages use `firecrawl_crawl`, and to discover page URLs use `firecrawl_map` or `firecrawl_search`. Options include JavaScript render delay, cache age, main-content filtering, PII redaction, and lockdown cache-only retrieval. Browser actions may change the live page when interactive actions are enabled.

Returns the selected content formats and page metadata.

- **`firecrawl_map`**: 
Enumerate URLs indexed under one website through Firecrawl without fetching each page's content. Use this when the request asks for a site's URL inventory, when several relevant pages must be located, or when the desired page URL is unknown. An optional `search` term narrows the URL list, while sitemap, subdomain, query-parameter, and result-limit options control coverage.

Returns matching URLs rather than page bodies. Retrieve one page with `firecrawl_scrape`; collect content across multiple pages with `firecrawl_crawl`.

- **`firecrawl_search`**: 
Search web, news, or image sources and return ranked results. Operators include quoted phrases, `-term`, `site:host`, `inurl:term`, `intitle:term`, and `related:host`; the set is non-exhaustive. `includeDomains` and `excludeDomains` are mutually exclusive hostname filters; categories limit results to GitHub, research, PDF, or developer sources.

For a programming question, add `categories: ["developer"]`. It searches an index of GitHub issues, merged pull requests, repository READMEs, and curated documentation sites, and returns the hits in `data.developer` beside the web results.

`scrapeOptions` can attach extracted page content. Returns source-type result groups and usage metadata. Authenticated responses can include an `id` for optional search feedback.

- **`firecrawl_search_feedback`**: 
Records schema-validated quality feedback for a prior `firecrawl_search` UUID `searchId`. A `good` rating requires a valuable source, `partial` a valuable source or at least one `missingContent` entry, and `bad` at least one `missingContent` entry or a query suggestion; caps are 50 `valuableSources` and 20 `missingContent` entries.

Eligibility is limited to successful searches within the feedback age window. The record is idempotent per search ID. Eligible first feedback for a search can refund 1 credit; refunds are subject to the team's daily cap. The response reports whether a refund was applied, along with submission and daily-cap status.

- **`firecrawl_feedback`**: 
Submit concise quality feedback for a completed search, scrape, parse, or map job. Provide the endpoint, job ID, rating, and relevant issue codes or small contextual fields; omit large page contents and raw outputs.

Returns submission status, feedback ID, and accounting fields.

- **`firecrawl_crawl`**: 
Start a multi-page crawl at a website URL, poll it to a terminal state, and return the final status and collected data. Scope can be bounded with include/exclude paths, depth, page limit, subdomain/external-link controls, sitemap handling, delay, and scrape options.

Crawl results can be large; use conservative limits when full-site coverage is unnecessary. Webhooks and interactive scrape actions are unavailable in safe mode. Returns the crawl ID, status, and page data.

- **`firecrawl_check_crawl_status`**: 
Retrieve the current status, progress, and available results for an existing crawl ID. This only reads Firecrawl job state and does not start or modify the crawl.

- **`firecrawl_extract`**: 
Extract structured information from one or more URLs with an optional natural-language prompt and JSON schema. It can include subdomains, follow external links, or use web search when those options are enabled.

Use this for a defined structured result rather than full page content. Returns data shaped by the supplied schema or prompt.

- **`firecrawl_agent`**: 
Start an asynchronous web research job from a prompt, optional seed URLs, and an optional JSON schema. Use this for a requested synthesis across multiple sources when the task can wait for asynchronous completion. The agent can search, navigate, read pages, and assemble a structured result.

This call returns only a job ID, not the research result. Read the job with `firecrawl_agent_status` until it reaches `completed` or `failed`; research commonly takes several minutes. If the job cannot finish within the task's available time, `firecrawl_search` and `firecrawl_scrape` can gather evidence synchronously.

- **`firecrawl_agent_status`**: 
Retrieve progress or final results for a `firecrawl_agent` job ID. A `processing` response is non-terminal and does not contain the final research result. Check again after 15–30 seconds until the status is `completed` or `failed`; complex jobs can take several minutes. If the job cannot finish within the task's available time, use `firecrawl_search` and `firecrawl_scrape` to complete the requested output.

Returns job status, progress information, and result data when completed.

- **`firecrawl_interact`**: 
Open or reuse a live browser session to navigate a page, click controls, fill fields, or run browser code. Provide either `url` or `scrapeId`, and either a natural-language `prompt` or executable `code`; code can run as Bash, Python, or Node with a bounded timeout.

This acts on the live site, so actions such as form submission can create persistent external side effects. Returns execution output, stdout/stderr, exit status, and session viewing URLs.

- **`firecrawl_interact_stop`**: 
Stop the live interact session associated with a `scrapeId` and release its resources. Returns a success confirmation.

- **`firecrawl_parse`**: 
Parse one supported document into markdown, HTML, links, summary, targeted answers, or JSON matching a schema. Supported inputs include common HTML, PDF, Word, RTF, OpenDocument, and spreadsheet files; PDF parsing can be bounded with `pdfOptions.maxPages`.

Local MCP reads `filePath` from the server filesystem. Hosted MCP uses two calls: first provide `filePath` to receive upload instructions, upload locally, then call again with the returned `uploadRef`; do not send both fields together. Remote web URLs belong in `firecrawl_scrape`.

Set `redactPII` to request redaction of personally identifiable information in the returned content. `zeroDataRetention` requires an eligible authenticated account; omit it for anonymous keyless use. Returns upload instructions for hosted phase one or parsed document content for the final call.

- **`firecrawl_monitor_create`**: 
Create a recurring scrape, crawl, or search monitor that compares each check with its retained predecessor. The simple form accepts `page`/`pages` or `queries` plus a plain-language `goal`; the advanced `body` form controls targets, schedule, change-tracking formats, judging, retention, webhook, and notifications.

In the simple form, a `goal` is required. If `queries` contains one or more non-empty values and is supplied with `page`/`pages`, `queries` create the search target and page targets are ignored. A monitor schedules future network checks and can send configured email or webhook notifications. Returns the created monitor.

- **`firecrawl_monitor_list`**: 
List monitors for the authenticated account with optional pagination controls. Returns one page of monitor records and pagination metadata.

- **`firecrawl_monitor_get`**: 
Retrieve one monitor by ID, including its configuration and current state. This does not run or modify the monitor.

- **`firecrawl_monitor_update`**: 
Patch an existing monitor by ID. The body can change its name, active/paused status, schedule, targets, goal, judging, webhook, notifications, or retention; these changes affect future scheduled checks.

Returns the updated monitor.

- **`firecrawl_monitor_delete`**: 
Permanently delete a monitor by ID and stop its future schedule. This operation cannot be undone and returns deletion status.

- **`firecrawl_monitor_run`**: 
Queue an immediate check for a monitor outside its normal schedule. This starts network work for the monitor's configured targets and returns the queued check.

- **`firecrawl_monitor_checks`**: 
List historical checks for a monitor, optionally filtered by status and bounded by a result limit. Returns one page of check summaries and pagination metadata.

- **`firecrawl_monitor_check`**: 
Retrieve one monitor check and its page-level results, optionally filtered by page status. Pages report `same`, `new`, `changed`, `removed`, or `error`; configured goal judging can add a meaningful-change decision.

Markdown tracking returns a unified text diff, JSON tracking returns field paths with previous/current values and a current snapshot, and mixed tracking returns both. Returns one page of results plus a `next` URL when more pages exist.

- **`firecrawl_research_search_papers`**: 
For topics represented in the indexed corpus, search paper metadata and abstracts with a natural-language query. Optional author, category, and date filters constrain results.

Returns ranked papers with canonical IDs, titles, authors, and abstracts.

- **`firecrawl_research_inspect_paper`**: 
Retrieve canonical metadata for one paper ID, such as an arXiv, PMC, PMID, or DOI identifier. Returns the title, abstract, authors, categories, source IDs, and dates as markdown.

- **`firecrawl_research_related_papers`**: 
Find citation-graph candidates from one to ten `seed_ids`; the first ID is the primary seed and later IDs are anchors. `mode` defaults to `similar` (co-citation/bibliographic coupling); `citers` returns papers citing a seed and `references` papers cited by a seed. `intent` ranks candidates.

Returns ranked candidates and the evaluated pool size.

- **`firecrawl_research_read_paper`**: 
Retrieve in-body passages from one paper that are relevant to a specific question. Full text is available only for indexed papers; `k` controls the number of passages.

Returns matching passages or a notice when full text is unavailable.

- **`firecrawl_research_search_github`**: 
Search indexed public GitHub issue, pull-request, and README content. Returns ranked matches with repository, URL, snippet, and full matched markdown when available.

- **`firecrawl_developer_search`**: 
For a developer question — code behaviour, a library or framework, an API contract, an error message, or a known bug — search an index built for coding agents. The index covers GitHub issues, merged pull requests, repository READMEs, and curated documentation sites. Set skills to "only" to limit the search to agent-skill files.

Returns ranked results with an ID, source type, URL, title, and the matched passages in markdown.

