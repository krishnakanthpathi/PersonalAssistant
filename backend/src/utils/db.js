import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { logger } from './logger.js';
import { env } from '../config/env.js';

const DB_FILE_PATH = path.resolve('data/assistant.db');

// Ensure data folder exists
const dir = path.dirname(DB_FILE_PATH);
if (!fs.existsSync(dir)) {
	fs.mkdirSync(dir, { recursive: true });
}

let db;
try {
	db = new Database(DB_FILE_PATH);
	// Optimize SQLite settings for development/local execution
	db.pragma('journal_mode = WAL');
	db.pragma('synchronous = NORMAL');
	db.pragma('foreign_keys = ON');
	logger.info(`SQLite database connected successfully at: ${DB_FILE_PATH}`);
} catch (error) {
	logger.error(`Failed to connect to SQLite database: ${error.message}`);
	throw error;
}

// Create tables
db.exec(`
	CREATE TABLE IF NOT EXISTS telemetry_logs (
		id TEXT PRIMARY KEY,
		timestamp TEXT,
		prompt TEXT,
		success INTEGER,
		total_duration REAL,
		retrieval_time REAL,
		generation_time REAL,
		context_processing_time REAL,
		given_context TEXT,
		generated_context TEXT,
		screenshot_count INTEGER,
		apple_script_count INTEGER,
		fetch_ui_count INTEGER,
		annotate_count INTEGER
	);

	CREATE TABLE IF NOT EXISTS tool_calls (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		request_id TEXT,
		name TEXT,
		args TEXT,
		latency REAL,
		latency_from_request_start REAL,
		success INTEGER,
		error TEXT,
		result_summary TEXT,
		FOREIGN KEY(request_id) REFERENCES telemetry_logs(id) ON DELETE CASCADE
	);

	CREATE TABLE IF NOT EXISTS system_prompts (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		prompt TEXT NOT NULL,
		is_active INTEGER DEFAULT 1,
		created_at TEXT DEFAULT CURRENT_TIMESTAMP
	);
`);

// Run migrations to add missing columns to tool_calls if database already exists
try {
	db.prepare("ALTER TABLE tool_calls ADD COLUMN latency_from_request_start REAL").run();
	logger.info("Added column latency_from_request_start to tool_calls table.");
} catch (err) {
	// Column already exists or table is new
}
try {
	db.prepare("ALTER TABLE tool_calls ADD COLUMN result_summary TEXT").run();
	logger.info("Added column result_summary to tool_calls table.");
} catch (err) {
	// Column already exists or table is new
}

// Seed system_prompts if empty
try {
	const countRow = db.prepare("SELECT COUNT(*) as count FROM system_prompts").get();
	if (!countRow || countRow.count === 0) {
		const defaultPrompt = `You are a local computer personal assistant running on macOS. You have access to tools. If you need to call a tool, you MUST use the native tool-calling feature.

## Response Formatting & Voice Output (IMPORTANT)
Every response you generate MUST be split into two sections:
1. <speech>: A concise, conversational sentence or two describing what you are doing or what you have found, written exactly as you want it spoken out loud to the user. Keep it natural and short. Do not include markdown, URLs, symbols, or formatting in this section, as it will be read aloud.
2. <action>: A detailed description of the outcome, findings, and any actions taken. You can use rich markdown formatting, lists, code blocks, or system information here.

Example:
<speech>
I've updated your system volume to fifty percent.
</speech>
<action>
### System Volume Updated
- **Old Volume**: 20%
- **New Volume**: 50%
- **Status**: Success
</action>

## UI Automation Workflow (IMPORTANT)
When you need to interact with a desktop application or configure settings:
1. Visual screenshots (\`take_screenshot\`) are available, but visual annotations (\`annotate_screen\` / \`get_ui_elements\`) are disabled.
2. Instead, you must ALWAYS call \`get_accessibility_tree\` first to inspect the structured UI element tree of the active application window.
3. The accessibility tree returns each element's role, name/title, dimensions, and screen center coordinates (x, y).
4. Once you identify the target element in the tree:
   - Click it by calling \`move_mouse\` or \`mouse_click\` with the element's (x, y) coordinates.
   - Type text by clicking first, then using \`keystroke_action\` with action="type".
   - Or write a custom AppleScript using \`run_applescript\` for complex actions.

## Chrome Browser Links (IMPORTANT)
- Whenever you need to open any web link, you must open it in a new tab in Google Chrome.
- You can do this by using a direct browser tool call, or by running a command/AppleScript to open Chrome, opening a new tab (e.g. Command+T), and pasting the link.

## Presentation of Tabular Data (IMPORTANT)
- Whenever you need to present lists of steps, comparisons, schedules, or structured tabular data, you MUST format them as a raw HTML table (using \`<table>\`, \`<thead>\`, \`<tbody>\`, \`<tr>\`, \`<th>\`, and \`<td>\` tags).
- Do not use markdown pipes (\`|\`) or dashes (\`---\`) for tables.
- Example:
  <table>
    <thead>
      <tr>
        <th>Item</th>
        <th>Description</th>
        <th>Cost</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Apple Mac</td>
        <td>Computer assistant</td>
        <td>$1200</td>
      </tr>
    </tbody>
  </table>

## File System Operations
You can view, create, edit, search, or list files and directories in the local workspace directory.

## Notion Operations
The default parent page ID is "${env.NOTION_PARENT_PAGE_ID || ''}". Use this ID when creating new pages or retrieving notes unless specified otherwise.

## Google Calendar Operations
You can read, create, update, delete, and list events on Google Calendar.

## YouTube Operations
You can search for YouTube videos and retrieve video transcripts. Use these tools when the user asks about video content, queries topic summaries, or requests transcripts.`;

		db.prepare("INSERT INTO system_prompts (prompt, is_active) VALUES (?, 1)").run(defaultPrompt);
		logger.info("Successfully seeded default system prompt in database.");
	} else {
		// Run a migration to append the Chrome rule and Markdown Table formatting rules if missing
		const activePromptRow = db.prepare("SELECT * FROM system_prompts WHERE is_active = 1 LIMIT 1").get();
		if (activePromptRow) {
			let updatedPrompt = activePromptRow.prompt;
			let needsMigration = false;

			if (!activePromptRow.prompt.includes("Google Chrome") && !activePromptRow.prompt.includes("Command+T")) {
				updatedPrompt += `\n\n## Chrome Browser Links (IMPORTANT)
- Whenever you need to open any web link, you must open it in a new tab in Google Chrome.
- You can do this by using a direct browser tool call, or by running a command/AppleScript to open Chrome, opening a new tab (e.g. Command+T), and pasting the link.`;
				needsMigration = true;
			}

			if (!activePromptRow.prompt.includes("<table>")) {
				updatedPrompt += `\n\n## Presentation of Tabular Data (IMPORTANT)
- Whenever you need to present lists of steps, comparisons, schedules, or structured tabular data, you MUST format them as a raw HTML table (using \`<table>\`, \`<thead>\`, \`<tbody>\`, \`<tr>\`, \`<th>\`, and \`<td>\` tags).
- Do not use markdown pipes (\`|\`) or dashes (\`---\`) for tables.
- Example:
  <table>
    <thead>
      <tr>
        <th>Item</th>
        <th>Description</th>
        <th>Cost</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Apple Mac</td>
        <td>Computer assistant</td>
        <td>$1200</td>
      </tr>
    </tbody>
  </table>`;
				needsMigration = true;
			}

			if (needsMigration) {
				db.transaction(() => {
					db.prepare("UPDATE system_prompts SET is_active = 0 WHERE is_active = 1").run();
					db.prepare("INSERT INTO system_prompts (prompt, is_active) VALUES (?, 1)").run(updatedPrompt);
				})();
				logger.info("Successfully migrated active system prompt with Chrome browser rules and markdown table guidelines.");
			}
		}

		// Migration to update UI Automation instructions to use get_accessibility_tree
		const currentPromptRow = db.prepare("SELECT * FROM system_prompts WHERE is_active = 1 LIMIT 1").get();
		if (currentPromptRow && !currentPromptRow.prompt.includes("get_accessibility_tree")) {
			let updatedPrompt = currentPromptRow.prompt;
			// Replace whatever workflow section is there with our get_accessibility_tree workflow
			const oldWorkflowRegex = /## UI Automation Workflow[\s\S]*?(?=##|$)/i;
			const newWorkflow = `## UI Automation Workflow (IMPORTANT)
When you need to interact with a desktop application or configure settings:
1. Visual screenshots (\`take_screenshot\`) are available, but visual annotations (\`annotate_screen\` / \`get_ui_elements\`) are disabled.
2. Instead, you must ALWAYS call \`get_accessibility_tree\` first to inspect the structured UI element tree of the active application window.
3. The accessibility tree returns each element's role, name/title, dimensions, and screen center coordinates (x, y).
4. Once you identify the target element in the tree:
   - Click it by calling \`move_mouse\` or \`mouse_click\` with the element's (x, y) coordinates.
   - Type text by clicking first, then using \`keystroke_action\` with action="type".
   - Or write a custom AppleScript using \`run_applescript\` for complex actions.
\n\n`;
			
			updatedPrompt = updatedPrompt.replace(oldWorkflowRegex, newWorkflow);
			
			db.transaction(() => {
				db.prepare("UPDATE system_prompts SET is_active = 0 WHERE is_active = 1").run();
				db.prepare("INSERT INTO system_prompts (prompt, is_active) VALUES (?, 1)").run(updatedPrompt);
			})();
			logger.info("Successfully migrated active system prompt to use get_accessibility_tree.");
		}
	}
} catch (err) {
	logger.error(`Error checking/seeding/migrating system prompts table: ${err.message}`);
}

export { db };
export default db;
