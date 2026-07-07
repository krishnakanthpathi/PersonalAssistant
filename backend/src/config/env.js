/**
 * App-wide settings & fallback defaults
 */
import dotenv from 'dotenv';
dotenv.config();

export const env = {
	PORT: process.env.PORT || 3000,
	NODE_ENV: process.env.NODE_ENV || 'development',
	LOG_LEVEL: process.env.LOG_LEVEL || 'info',
	OLLAMA_URL: process.env.OLLAMA_URL || 'http://localhost:11434',
	OLLAMA_MODEL: process.env.OLLAMA_MODEL || 'llama3.1',
	NOTION_TOKEN: process.env.NOTION_TOKEN,
	NOTION_PARENT_PAGE_ID: process.env.NOTION_PARENT_PAGE_ID,
	OPENAI_API_KEY: process.env.OPENAI_API_KEY,
	OPENAI_BASE_URL: process.env.OPENAI_BASE_URL,
	OPENAI_MODEL: process.env.OPENAI_MODEL || 'glm-4',
	LLM_PROVIDER: process.env.LLM_PROVIDER || (process.env.OPENAI_API_KEY ? 'openai' : 'ollama'),
};

