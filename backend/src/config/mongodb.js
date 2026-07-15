import { MongoClient } from 'mongodb';
import { env } from './env.js';
import { logger } from '../utils/logger.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROMPT_FILE_PATH = path.join(__dirname, 'system_prompt.md');

let client = null;
let db = null;

export async function connectToMongoDB() {
	if (db) return db;

	try {
		logger.info(`Connecting to MongoDB at: ${env.MONGO_URI}`);
		client = new MongoClient(env.MONGO_URI, {
			connectTimeoutMS: 5000,
			socketTimeoutMS: 30000,
		});

		await client.connect();
		db = client.db(env.MONGO_DB_NAME);
		logger.info(`MongoDB connected successfully to database: ${env.MONGO_DB_NAME}`);

		// Load custom DB configuration overrides
		await loadDbConfig();

		// Seed the system prompt from Markdown file if empty
		try {
			const collection = db.collection('system_prompts');
			const count = await collection.countDocuments();
			if (count === 0) {
				const defaultPrompt = await fs.promises.readFile(PROMPT_FILE_PATH, 'utf8');
				await collection.insertOne({
					prompt: defaultPrompt,
					isActive: true,
					createdAt: new Date()
				});
				logger.info("Successfully seeded original default system prompt in MongoDB from system_prompt.md.");
			}
		} catch (err) {
			logger.error(`Error checking/seeding system prompt in MongoDB: ${err.message}`);
		}

		// Gracefully handle application termination to close client connection
		process.on('SIGINT', cleanup);
		process.on('SIGTERM', cleanup);

		return db;
	} catch (error) {
		logger.error(`Failed to connect to MongoDB: ${error.message}`);
		throw error;
	}
}

export async function loadDbConfig() {
	if (!db) return;
	try {
		const collection = db.collection('app_config');
		const configDoc = await collection.findOne({ _id: 'llm_settings' });
		if (configDoc) {
			if (configDoc.provider) env.LLM_PROVIDER = configDoc.provider;
			if (configDoc.openaiApiKey) env.OPENAI_API_KEY = configDoc.openaiApiKey;
			if (configDoc.openaiBaseUrl) env.OPENAI_BASE_URL = configDoc.openaiBaseUrl;
			if (configDoc.openaiModel) env.OPENAI_MODEL = configDoc.openaiModel;
			if (configDoc.ollamaUrl) env.OLLAMA_URL = configDoc.ollamaUrl;
			if (configDoc.ollamaModel) env.OLLAMA_MODEL = configDoc.ollamaModel;
			if (configDoc.grokApiKey) env.GROK_API_KEY = configDoc.grokApiKey;
			if (configDoc.grokBaseUrl) env.GROK_BASE_URL = configDoc.grokBaseUrl;
			if (configDoc.grokModel) env.GROK_MODEL = configDoc.grokModel;
			logger.info("Loaded custom LLM provider configuration overrides from MongoDB database.");
		}
	} catch (error) {
		logger.error(`Error loading database configuration overrides: ${error.message}`);
	}
}

async function cleanup() {
	try {
		if (client) {
			await client.close();
			logger.info('MongoDB client connection closed.');
		}
	} catch (err) {
		logger.error(`Error during MongoDB cleanup: ${err.message}`);
	} finally {
		process.exit(0);
	}
}

/**
 * Helper to get the DB instance directly if already connected,
 * or trigger connection asynchronously.
 */
export function getDB() {
	if (!db) {
		throw new Error('Database not initialized. Call connectToMongoDB() first.');
	}
	return db;
}
