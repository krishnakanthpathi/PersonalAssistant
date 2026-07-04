# Personal Assistant

An agentic, multi-turn personal assistant backend built with Node.js, Express, Ollama, and the Model Context Protocol (MCP).

## Current Features
* **Agent Reasoning Loop**: Continuously evaluates tool outputs and loops until the task is complete.
* **Fallback XML Parser**: Dynamically extracts `<tool_call>` blocks from conversational text for models that fallback to XML.
* **Modular MCP Switchboard**: Automatically loads local/external tools and connects to MCP servers over standard input/output streams (`stdio`).
* **Winston Logging**: High-performance color-coded terminal log formatting and persistent JSON files.
* **Filesystem MCP**: Integrates local workspace read, write, search, and directory navigation tools.

---

## MCP Integration Roadmap (To-Do List)

* [x] **Filesystem MCP** (Integrated) — Read, write, list, and search files inside the workspace.
* [ ] **Fetch MCP** — Fetch remote web pages and convert them to clean Markdown.
* [ ] **Brave Search MCP** — Retrieve real-time search engine results from the web.
* [ ] **Memory MCP** — Enable graph-based long-term memory to record personal preferences and facts.
* [ ] **SQLite MCP** — Query and store structured personal data in a local SQLite file.
* [ ] **Google Workspace MCP** — Integrate Google Calendar and Gmail to manage schedules and draft emails.
* [ ] **Todoist MCP** — Create, list, and organize tasks and inbox items.
* [ ] **Notion MCP** — Connect to database tables for notes and tracking.
* [ ] **Spotify MCP** — Search and control playbacks of music.
* [ ] **Home Assistant MCP** — Toggle smart lights and check local home sensor metrics.

---

## Getting Started

### 1. Configure Environment Variables
Create a `backend/.env` file:
```env
PORT=3000
NODE_ENV=development
LOG_LEVEL=info
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5:7b
```

### 2. Configure MCP Servers
Expose allowed paths in `backend/mcp-config.json`:
```json
{
	"mcpServers": {
		"filesystem": {
			"command": "npx",
			"args": [
				"-y",
				"@modelcontextprotocol/server-filesystem",
				"/Users/krishnakanth/Projects/PersonalAssisstent"
			]
		}
	}
}
```

### 3. Run the Development Server
```bash
cd backend
npm run dev
```
