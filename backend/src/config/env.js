/**
 * App-wide settings & fallback defaults
 */
import dotenv from 'dotenv';
dotenv.config();

export const env = {
	// development
	PORT: process.env.PORT || 3000,
	NODE_ENV: process.env.NODE_ENV || 'development',
	LOG_LEVEL: process.env.LOG_LEVEL || 'info',

	// llm provider
	LLM_PROVIDER: process.env.LLM_PROVIDER || (process.env.OPENAI_API_KEY ? 'openai' : 'ollama'),
	EMBEDDING_PROVIDER: process.env.EMBEDDING_PROVIDER,

	// multimedia / vision model settings
	USE_MULTIMEDIA_MODEL: process.env.USE_MULTIMEDIA_MODEL === 'true',
	MULTIMEDIA_PROVIDER: process.env.MULTIMEDIA_PROVIDER || 'ollama',
	MULTIMEDIA_MODEL: process.env.MULTIMEDIA_MODEL || '',
	MULTIMEDIA_API_KEY: process.env.MULTIMEDIA_API_KEY || '',
	MULTIMEDIA_BASE_URL: process.env.MULTIMEDIA_BASE_URL || '',

	// ollama
	OLLAMA_URL: process.env.OLLAMA_URL || 'http://localhost:11434',
	OLLAMA_MODEL: process.env.OLLAMA_MODEL || 'llama3.1',

	// openAi
	OPENAI_API_KEY: process.env.OPENAI_API_KEY,
	OPENAI_BASE_URL: process.env.OPENAI_BASE_URL,
	OPENAI_MODEL: process.env.OPENAI_MODEL || 'glm-4',
	OPENAI_EMBEDDING_MODEL: process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small',

	// grok
	GROK_API_KEY: process.env.GROK_API_KEY,
	GROK_BASE_URL: process.env.GROK_BASE_URL || 'https://api.x.ai/v1',
	GROK_MODEL: process.env.GROK_MODEL || 'grok-2-1218',

	// mcps
	NOTION_TOKEN: process.env.NOTION_TOKEN,
	NOTION_PARENT_PAGE_ID: process.env.NOTION_PARENT_PAGE_ID,

	// embeddings
	OLLAMA_EMBEDDING_MODEL: process.env.OLLAMA_EMBEDDING_MODEL || 'nomic-embed-text',
	EMBEDDING_API_KEY: process.env.EMBEDDING_API_KEY,
	EMBEDDING_BASE_URL: process.env.EMBEDDING_BASE_URL,

	// youtube
	YOUTUBE_API_KEY: process.env.YOUTUBE_API_KEY,

	// tools
	MAX_RELEVANT_TOOLS: parseInt(process.env.MAX_RELEVANT_TOOLS || '20', 10),
	TOOL_SIMILARITY_THRESHOLD: parseFloat(process.env.TOOL_SIMILARITY_THRESHOLD || '0.25'),

	// personal rag db
	RAG_PERSONAL_DB_LIMIT: parseInt(process.env.RAG_PERSONAL_DB_LIMIT || '8', 10),
	RAG_PERSONAL_DB_THRESHOLD: parseFloat(process.env.RAG_PERSONAL_DB_THRESHOLD || '0.20'),

	// mongodb
	MONGO_URI: process.env.MONGO_URI || 'mongodb://localhost:27017',
	MONGO_DB_NAME: process.env.MONGO_DB_NAME || 'assistant_platform',

	// chroma
	CHROMA_URL: process.env.CHROMA_URL || 'http://localhost:8000',
};



