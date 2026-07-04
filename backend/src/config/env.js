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
};

