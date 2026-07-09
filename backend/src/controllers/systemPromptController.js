import { db } from '../utils/db.js';
import { logger } from '../utils/logger.js';

export const getSystemPrompt = (req, res) => {
	try {
		const activePrompt = db.prepare("SELECT * FROM system_prompts WHERE is_active = 1 ORDER BY id DESC LIMIT 1").get();
		const history = db.prepare("SELECT * FROM system_prompts ORDER BY id DESC").all();
		res.json({ success: true, activePrompt, history });
	} catch (error) {
		logger.error(`Error fetching system prompts: ${error.message}`);
		res.status(500).json({ success: false, error: error.message });
	}
};

export const saveSystemPrompt = (req, res) => {
	const { prompt } = req.body;
	if (!prompt || typeof prompt !== 'string') {
		return res.status(400).json({ success: false, error: "Prompt is required and must be a string." });
	}
	try {
		db.transaction(() => {
			db.prepare("UPDATE system_prompts SET is_active = 0 WHERE is_active = 1").run();
			db.prepare("INSERT INTO system_prompts (prompt, is_active) VALUES (?, 1)").run(prompt);
		})();
		res.json({ success: true });
	} catch (error) {
		logger.error(`Error saving system prompt: ${error.message}`);
		res.status(500).json({ success: false, error: error.message });
	}
};

export const activateSystemPrompt = (req, res) => {
	const { id } = req.body;
	if (!id) {
		return res.status(400).json({ success: false, error: "ID is required." });
	}
	try {
		db.transaction(() => {
			db.prepare("UPDATE system_prompts SET is_active = 0").run();
			db.prepare("UPDATE system_prompts SET is_active = 1 WHERE id = ?").run(id);
		})();
		res.json({ success: true });
	} catch (error) {
		logger.error(`Error activating system prompt: ${error.message}`);
		res.status(500).json({ success: false, error: error.message });
	}
};

export const deleteSystemPrompt = (req, res) => {
	const { id } = req.params;
	try {
		const row = db.prepare("SELECT is_active FROM system_prompts WHERE id = ?").get(id);
		if (!row) {
			return res.status(404).json({ success: false, error: "System prompt not found." });
		}
		if (row.is_active === 1) {
			return res.status(400).json({ success: false, error: "Cannot delete the active system prompt." });
		}
		db.prepare("DELETE FROM system_prompts WHERE id = ?").run(id);
		res.json({ success: true });
	} catch (error) {
		logger.error(`Error deleting system prompt: ${error.message}`);
		res.status(500).json({ success: false, error: error.message });
	}
};
