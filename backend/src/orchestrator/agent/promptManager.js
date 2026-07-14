import { getDB } from '../../config/mongodb.js';
import { logger } from '../../utils/logger.js';
import { env } from '../../config/env.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROMPT_FILE_PATH = path.join(__dirname, '../../config/system_prompt.md');

export async function loadSystemPrompt() {
	let systemPromptText;
	try {
		const db = getDB();
		const row = await db.collection('system_prompts').findOne({ isActive: true });
		systemPromptText = row?.prompt;
	} catch (error) {
		logger.error(`Failed to load system prompt from MongoDB: ${error.message}`);
	}

	if (!systemPromptText) {
		try {
			systemPromptText = await fs.promises.readFile(PROMPT_FILE_PATH, 'utf8');
		} catch (error) {
			logger.error(`Failed to read fallback system prompt from file: ${error.message}`);
			systemPromptText = "You are a local computer personal assistant running on macOS. You have access to tools.";
		}
	}
	return systemPromptText;
}

export async function prepareMessages(prompt, history) {
	// Sanitize and map standard message fields from history
	const cleanedHistory = history
		.map(m => ({
			role: m.role,
			content: m.content
		}))
		.filter(m => m.role && m.content);

	const systemPromptText = await loadSystemPrompt();

	// Prepare message history
	const messages = [
		{
			role: 'system',
			content: systemPromptText
		},
		...cleanedHistory,
		{ role: 'user', content: prompt }
	];

	// Generate a search query for tool selection that combines previous user inputs
	// to maintain context
	const userMessages = cleanedHistory.filter(m => m.role === 'user').slice(-2);
	const combinedRAGQuery = [...userMessages.map(m => m.content), prompt].join(' ');

	return {
		messages,
		cleanedHistory,
		combinedRAGQuery
	};
}
