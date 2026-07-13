import { Agent } from '../orchestrator/agent.js';
import { logger } from '../utils/logger.js';
import { db } from '../utils/db.js';
import crypto from 'crypto';

const agent = new Agent();

// Create tables for chats if they don't exist
db.exec(`
	CREATE TABLE IF NOT EXISTS chat_sessions (
		id TEXT PRIMARY KEY,
		title TEXT,
		created_at TEXT DEFAULT CURRENT_TIMESTAMP,
		updated_at TEXT DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS chat_messages (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		session_id TEXT,
		role TEXT,
		content TEXT,
		speech TEXT,
		logs TEXT,
		is_error INTEGER DEFAULT 0,
		created_at TEXT DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY(session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE
	);
`);

export const handleChat = async (req, res) => {
	let { prompt, history, sessionId } = req.body;
	logger.info(`Received chat request: ${prompt} (session: ${sessionId})`);

	// Ensure we have a valid sessionId
	if (!sessionId) {
		sessionId = crypto.randomUUID();
	}

	// Set headers for Server-Sent Events (SSE)
	res.setHeader('Content-Type', 'text/event-stream');
	res.setHeader('Cache-Control', 'no-cache');
	res.setHeader('Connection', 'keep-alive');
	res.setHeader('X-Accel-Buffering', 'no'); // Prevent proxy buffering

	const sendSSE = (type, content) => {
		res.write(`data: ${JSON.stringify({ type, content })}\n\n`);
	};

	try {
		// 1. Insert or update the chat session
		const sessionCheck = db.prepare("SELECT 1 FROM chat_sessions WHERE id = ?").get(sessionId);
		if (!sessionCheck) {
			const title = prompt.length > 50 ? prompt.substring(0, 47) + "..." : prompt;
			db.prepare("INSERT INTO chat_sessions (id, title) VALUES (?, ?)").run(sessionId, title);
		} else {
			db.prepare("UPDATE chat_sessions SET updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(sessionId);
		}

		// 2. Insert user message
		db.prepare("INSERT INTO chat_messages (session_id, role, content) VALUES (?, 'user', ?)").run(sessionId, prompt);

		// 3. Run agent with history
		const response = await agent.run(prompt, history, (status) => {
			sendSSE('status', status);
		});

		// 4. Save assistant response
		const logsJson = response.logs ? JSON.stringify(response.logs) : null;
		db.prepare("INSERT INTO chat_messages (session_id, role, content, speech, logs, is_error) VALUES (?, 'assistant', ?, ?, ?, 0)")
			.run(sessionId, response.content || response, response.speech || null, logsJson);

		// Send result along with sessionId so frontend can set/update it
		sendSSE('result', { ...response, sessionId });
	} catch (error) {
		logger.error(`Error in chat endpoint: ${error.message}`);
		db.prepare("INSERT INTO chat_messages (session_id, role, content, is_error) VALUES (?, 'assistant', ?, 1)")
			.run(sessionId, `Error: ${error.message}`);
		sendSSE('error', error.message);
	} finally {
		res.end();
	}
};

// Get all chat sessions
export const getChats = async (req, res) => {
	try {
		const rows = db.prepare("SELECT * FROM chat_sessions ORDER BY updated_at DESC").all();
		res.json({ success: true, chats: rows });
	} catch (error) {
		logger.error(`Error fetching chat sessions: ${error.message}`);
		res.status(500).json({ success: false, error: error.message });
	}
};

// Get all messages for a specific session
export const getChatMessages = async (req, res) => {
	const { sessionId } = req.params;
	try {
		const rows = db.prepare("SELECT * FROM chat_messages WHERE session_id = ? ORDER BY id ASC").all(sessionId);
		// Map logs back to objects
		const messages = rows.map(m => ({
			role: m.role,
			content: m.content,
			speech: m.speech,
			isError: m.is_error === 1,
			logs: m.logs ? JSON.parse(m.logs) : []
		}));
		res.json({ success: true, messages });
	} catch (error) {
		logger.error(`Error fetching messages for session ${sessionId}: ${error.message}`);
		res.status(500).json({ success: false, error: error.message });
	}
};

// Delete a session
export const deleteChatSession = async (req, res) => {
	const { sessionId } = req.params;
	try {
		db.prepare("DELETE FROM chat_sessions WHERE id = ?").run(sessionId);
		res.json({ success: true });
	} catch (error) {
		logger.error(`Error deleting chat session ${sessionId}: ${error.message}`);
		res.status(500).json({ success: false, error: error.message });
	}
};
