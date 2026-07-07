# Personal Assistant

An agentic, multi-turn personal assistant backend built with Node.js, Express, Ollama, and the Model Context Protocol (MCP).

## Current Features
* **Agent Reasoning Loop**: Continuously evaluates tool outputs and loops until the task is complete.
* **Fallback XML Parser**: Dynamically extracts `<tool_call>` blocks from conversational text for models that fallback to XML.
* **Modular MCP Switchboard**: Automatically loads local/external tools and connects to MCP servers over standard input/output streams (`stdio`).
* **Winston Logging**: High-performance color-coded terminal log formatting and persistent JSON files.
* **Filesystem MCP**: Integrates local workspace read, write, search, and directory navigation tools.
* **Notion MCP**: Read, write, search, and update page elements in your Notion workspace.
* **Puppeteer MCP**: Local browser automation to search, screenshot, click, and auto-fill web forms.

---

## MCP Integration Roadmap (To-Do List)

* [x] **Filesystem MCP** (Integrated) — Read, write, list, and search files inside the workspace.
* [x] **Notion MCP** (Integrated) — Connect to your Notion workspace to manage structured notes and documents.
* [x] **Puppeteer MCP** (Integrated) — Browse, scrape, and auto-fill web forms.
* [ ] **Brave Search MCP** — Retrieve real-time search engine results from the web.
* [ ] **Memory MCP** — Enable graph-based long-term memory to record personal preferences and facts.
* [ ] **SQLite MCP** — Query and store structured personal data in a local SQLite file.
* [ ] **Google Workspace MCP** — Integrate Google Calendar and Gmail to manage schedules and draft emails.
* [ ] **Todoist MCP** — Create, list, and organize tasks and inbox items.
* [ ] **Spotify MCP** — Search and control playbacks of music.
* [ ] **Home Assistant MCP** — Toggle smart lights and check local home sensor metrics.

---

## Getting Started

### 1. Configure Environment Variables
Create or update your `backend/.env` file:
```env
PORT=3000
NODE_ENV=development
LOG_LEVEL=info

# LLM Provider: 'ollama' or 'openai'
LLM_PROVIDER=openai

# Ollama Settings (if provider is ollama)
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5:7b

# OpenAI Settings (if provider is openai, e.g. for GLM 5.2 or custom compatible endpoints)
OPENAI_API_KEY=your-api-key-here
OPENAI_BASE_URL=https://open.bigmodel.cn/api/paas/v4/ # Optional custom base URL (e.g. Zhipu)
OPENAI_MODEL=glm-4                                    # Active model name/ID
```

### 2. Configure MCP Servers
Expose allowed paths and servers in `backend/mcp-config.json`:
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
		},
		"notion": {
			"command": "npx",
			"args": [
				"-y",
				"@notionhq/notion-mcp-server"
			]
		},
		"puppeteer": {
			"command": "npx",
			"args": [
				"-y",
				"@modelcontextprotocol/server-puppeteer"
			]
		}
	}
}
```

### 3. Run the Development Servers

You can launch both the backend API and the frontend dashboard concurrently using the root-level script:
```bash
# From the project root, run:
bash start.sh
```

Alternatively, you can run them in separate terminals:

#### Running the Backend API:
```bash
cd backend
npm run dev
```

#### Running the Frontend Web Dashboard:
```bash
cd frontend
npm install # if not already installed
npm run dev
```

### 4. Puppeteer Setup (Browser Autofill & Search)
The Puppeteer MCP server requires a specific version of Chrome. If you receive a "Could not find Chrome" error, install the required version by running:
```bash
cd backend
npx puppeteer browsers install chrome@131.0.6778.204
```
