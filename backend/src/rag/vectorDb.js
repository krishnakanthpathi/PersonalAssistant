/**
 * MongoDB-backed and memory-cached vector database for caching tool embeddings
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getDB } from '../config/mongodb.js';
import { logger } from '../utils/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_FILE_PATH = path.join(__dirname, '../../data/tool_embeddings.json');

function extractToolMeta(tool) {
	const name = tool.function?.name || tool.name || '';
	const description = tool.function?.description || tool.description || '';
	const parameters = tool.function?.parameters || tool.parameters || tool.inputSchema || {};
	return { name, description, parameters };
}

export class VectorDB {
	constructor() {
		this.toolsCache = new Map(); // key: toolName -> { tool, embedding, embeddingModel }
	}

	async connect() {
		try {
			const db = getDB();
			const collection = db.collection('tool_embeddings');

			// Count existing documents in MongoDB
			const count = await collection.countDocuments();

			// If MongoDB is empty, seed from local JSON file if it exists
			if (count === 0 && fs.existsSync(DB_FILE_PATH)) {
				logger.info(`Seeding MongoDB tool_embeddings from local JSON file: ${DB_FILE_PATH}`);
				const rawData = fs.readFileSync(DB_FILE_PATH, 'utf8');
				if (rawData.trim()) {
					const data = JSON.parse(rawData);
					if (data.length > 0) {
						const documents = data.map(item => ({
							_id: item.name,
							tool: item.tool,
							embedding: item.embedding,
							embeddingModel: item.embeddingModel || 'default'
						}));
						await collection.insertMany(documents);
						logger.info(`Successfully seeded ${documents.length} tool embeddings to MongoDB.`);
					}
				}
			}

			// Load all documents from MongoDB into in-memory cache
			const docs = await collection.find().toArray();
			for (const doc of docs) {
				this.toolsCache.set(doc._id, {
					tool: doc.tool,
					embedding: doc.embedding,
					embeddingModel: doc.embeddingModel
				});
			}
			logger.info(`Loaded ${this.toolsCache.size} cached tool embeddings from MongoDB.`);
		} catch (error) {
			logger.error(`Failed to load vector database from MongoDB: ${error.message}`);
		}
	}

	async save() {
		try {
			const db = getDB();
			const collection = db.collection('tool_embeddings');

			// Upsert all cached items to MongoDB
			for (const [name, val] of this.toolsCache.entries()) {
				await collection.replaceOne(
					{ _id: name },
					{
						tool: val.tool,
						embedding: val.embedding,
						embeddingModel: val.embeddingModel
					},
					{ upsert: true }
				);
			}
			logger.info(`Saved ${this.toolsCache.size} tool embeddings to MongoDB.`);
		} catch (error) {
			logger.error(`Failed to save vector database to MongoDB: ${error.message}`);
		}
	}

	get(name) {
		return this.toolsCache.get(name);
	}

	set(name, tool, embedding, embeddingModel) {
		this.toolsCache.set(name, { tool, embedding, embeddingModel });
	}

	isUpToDate(name, toolDef, currentModel) {
		const cached = this.toolsCache.get(name);
		if (!cached) return false;
		
		// Invalidate if the embedding model changed
		if (cached.embeddingModel !== currentModel) {
			logger.info(`Invalidating cache for tool "${name}" because model changed: ${cached.embeddingModel} -> ${currentModel}`);
			return false;
		}
		
		const cachedMeta = extractToolMeta(cached.tool);
		const currentMeta = extractToolMeta(toolDef);
		
		// Check description and function parameters
		const descriptionMatch = cachedMeta.description === currentMeta.description;
		const parametersMatch = JSON.stringify(cachedMeta.parameters) === JSON.stringify(currentMeta.parameters);

		return descriptionMatch && parametersMatch;
	}

	getAll() {
		return Array.from(this.toolsCache.values());
	}

	async clear() {
		try {
			this.toolsCache.clear();
			const db = getDB();
			await db.collection('tool_embeddings').deleteMany({});
			logger.info('Cleared all tool embeddings from MongoDB.');
		} catch (error) {
			logger.error(`Failed to clear tool embeddings in MongoDB: ${error.message}`);
		}
	}
}
