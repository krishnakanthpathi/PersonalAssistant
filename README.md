# Personal Assistant

An agentic, multi-turn personal assistant platform built with Node.js, Express, React (Vite), and Model Context Protocol (MCP). It lets you automate your macOS workspace, run local/web automation flows, manage Notion notes, and query local files using a natural language interface.

---

## 🚀 Key Capabilities

### 1. macOS Desktop & System Control (Custom Native Tools)
* **Active Window Tracking**: Gets the name of the frontmost focused application.
* **Keyboard Automation**: Simulates custom key combos (like Cmd+Space, Enter, Escape) or types multi-line text (pasted via clipboard backup/restore to protect slashes, newlines, and layout format).
* **System Settings**: Controls system speaker volume levels, display monitor brightness, and locks screens instantly.
* **Network & Stats**: Monitors Wi-Fi SSID network connection names (and toggles Wi-Fi status cards) and reads real-time battery and disk diagnostics.
* **Application Control**: Indexes all installed GUI applications, launches them, and gracefully terminates them.
* **Clipboard Manager**: Interacts natively with clipboard text (read/write).
* **System Utilities**: Controls Apple Music / Spotify track states, empties Finder trash, toggles Dark/Light appearance modes, and takes screen captures.
* **Text-To-Speech**: Synthesizes speech out loud via macOS `say`.

### 2. Model Context Protocol (MCP) Integration
* **Filesystem MCP**: Grants read, write, search, and directory tree navigation inside the workspace.
* **Notion MCP**: Integrates search, creation, reading, and updating pages/databases in your Notion workspace.
* **Puppeteer MCP**: Enables browser automation to scrap pages, auto-fill forms, and click selectors.

### 3. Dynamic RAG Tool Embedding System
* Uses a local vector database to index descriptions of all registered tools (local + MCP).
* Dynamically ranks the most relevant tools for your query on each prompt to keep the LLM context window small and maximize inference performance.

### 4. Live Streaming Web Dashboard
* Built with Vite + React + Tailwind CSS.
* Connects to the backend server via Server-Sent Events (SSE) to display real-time LLM token streams, reasoning steps, tool calls, and tool execution success status.

---

## 🛠️ Getting Started

### 1. Setup Environment Configuration
Create or update your `backend/.env` file:
```env
PORT=5001
NODE_ENV=development
LOG_LEVEL=info

# LLM Provider: 'ollama' or 'openai'
LLM_PROVIDER=openai

# OpenAI Settings (e.g. for compatible endpoints like GLM 4 or OpenAI GPTs)
OPENAI_API_KEY=your-api-key-here
OPENAI_BASE_URL=https://open.bigmodel.cn/api/paas/v4/ # Optional custom base URL
OPENAI_MODEL=glm-4                                    # Active model name/ID
```

### 2. Configure MCP Servers
Add external servers inside `backend/mcp-config.json`:
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

### 3. Start the Platform
You can run the backend API server and frontend React dashboard concurrently from the root directory:
```bash
# Start both services
bash start.sh
```

Alternatively, run them separately:
* **Backend**: `cd backend && npm run dev`
* **Frontend**: `cd frontend && npm run dev`
