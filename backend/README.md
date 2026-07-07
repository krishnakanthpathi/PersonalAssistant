# Personal Assistant Backend Engine

The backend is a Node.js Express server acting as the orchestration layer for the Personal Assistant. It coordinates LLM reasoning, registers local and Model Context Protocol (MCP) tools, ranks tools dynamically using an embedded vector database (RAG), and provides Server-Sent Events (SSE) streaming for status logs and LLM completion output.

---

## 1. Backend Architecture

The backend consists of several key layers:
1. **HTTP Express server** (`src/server.js`): Exposes API routes for tool catalogs, LLM configuration, and streaming chat completions.
2. **MCP Manager** (`src/mcp/mcpManager.js`): Spawns and manages standard input/output (`stdio`) streams to external MCP servers (Filesystem, Notion, Puppeteer, etc.).
3. **Tool Registry** (`src/orchestrator/registry.js`): Imports and manages the catalog of local native macOS scripts and external MCP tools.
4. **Vector Database RAG pipeline** (`src/rag/`): Maintains local embedding vector files representing descriptions of all tools. Matches queries to a ranked list of relevant tools to minimize LLM token consumption.
5. **Agent Loop** (`src/orchestrator/agent.js`): Executes the core LLM loop, executing tool calls on the machine, feeding the results back to the model, and updating execution steps until task completion.

---

## 2. API REST Routes

The server runs on the port specified in `backend/.env` (default is `3000` or `5001`) and exposes the following endpoints:

### Health Check
* **Route**: `GET /`
* **Response**:
  ```json
  {
    "status": true,
    "os": "darwin",
    "message": "Server is running"
  }
  ```

### Active Tools Catalog
* **Route**: `GET /api/tools`
* **Purpose**: Retrieves all currently registered local tools and active MCP tools formatted for the LLM schema.

### Active Configuration
* **Route**: `GET /api/config`
* **Purpose**: Returns the active LLM provider (`openai` or `ollama`), model identifier, base URL, and port.

### Agent Chat Completion (Streaming)
* **Route**: `POST /api/chat`
* **Headers**: `Content-Type: text/event-stream` (Server-Sent Events)
* **Body parameters**:
  * `prompt`: The user instruction (e.g., "Open Safari and search Google").
  * `history`: Array of previous conversational messages.
* **Stream Events**:
  * `type: "status"`: Emits real-time reasoning logs (e.g., "Calling open_application...", "Taking screenshot...").
  * `type: "result"`: Emits chunks of the final LLM response.
  * `type: "error"`: Emits server-side execution failures.

---

## 3. RAG Tool Selection Database

To avoid overwhelming the LLM with dozens of tool definitions, the backend uses a local **Retrieval-Augmented Generation (RAG)** pipeline to dynamically index and select tools:
* **Vector DB** (`src/rag/vectorDb.js`): Stores vector coordinates locally in `data/tool_embeddings.json`.
* **Embedder** (`src/rag/embedder.js`): Embeds text descriptions of the tools using the model specified in environment variables (Ollama or OpenAI embeddings).
* **Ranker Pipeline** (`src/rag/pipeline.js`): Evaluates user query strings against tool vectors. It ranks tools by cosine similarity score, combining semantic match scores with keyword matching weights to prioritize the top candidate tools.
* **Cache Invalidation**: Automatically clears and rebuilds the JSON database whenever a tool description changes or the embedding model changes.

---

## 4. Custom Native macOS Tools

The backend registers a bundle of native scripts located in `src/tools/mac/` to automate macOS directly:

* **`list_applications`** (`listApplications.js`): Indexes and lists local applications installed across macOS system and user directories.
* **`open_application`** (`openApplication.js`): Launches target application names via `open -a "<app>"`.
* **`close_application`** (`closeApplication.js`): Gracefully quits apps using AppleScript `quit application "<app>"`.
* **`open_url`** (`openUrl.js`): Opens any web URL in the default browser.
* **`get_active_window`** (`activeWindow.js`): Retrieves the active focused window's application name on the screen.
* **`keystroke_action`** (`keystroke.js`): Simulates keyboard key shortcuts (like Cmd+Space, Enter, Escape) or types long text formatting (pasted via clipboard backup/restore strategy to preserve slashes and newlines).
* **`take_screenshot`** (`screenshot.js`): Saves a full screen capture file inside `data/screenshots/`.
* **`get_system_stats`** (`getSystemStats.js`): Returns local battery percentages and primary disk memory storage statistics.
* **`wifi_control`** (`wifiControl.js`): Reports active SSID Wi-Fi network connection name or toggles Wi-Fi cards on/off.
* **`set_dark_mode`** (`darkMode.js`): Toggles or explicitly sets macOS Light/Dark mode settings.
* **`say_speech`** (`saySpeech.js`): Synthesizes spoken voice audio using Mac's built-in `say` command.
* **`lock_screen`** (`lockScreen.js`): Locks display screens instantly.
* **`volume_set`** & **`get_volume`** (`volumeSet.js` & `getVolume.js`): Controls output sound volumes (0-100).
* **`set_brightness`** (`setBrightness.js`): Changes monitor brightness values.
* **`clipboard_action`** (`clipboard.js`): Reads from (`pbpaste`) or writes to (`pbcopy`) system clipboard natively.
* **`media_control`** (`mediaControl.js`): Pauses, plays, skips, or reviews media playback in Spotify or Apple Music.
* **`empty_trash`** (`emptyTrash.js`): Empties Finder trash folders natively.
