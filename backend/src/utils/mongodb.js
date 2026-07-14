import { MongoClient } from 'mongodb';
import { env } from '../config/env.js';
import { logger } from './logger.js';

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

		// Gracefully handle application termination to close client connection
		process.on('SIGINT', cleanup);
		process.on('SIGTERM', cleanup);

		return db;
	} catch (error) {
		logger.error(`Failed to connect to MongoDB: ${error.message}`);
		throw error;
	}
}

async function cleanup() {
	if (client) {
		await client.close();
		logger.info('MongoDB client connection closed.');
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
