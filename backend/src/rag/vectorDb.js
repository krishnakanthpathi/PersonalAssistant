/**
 * ChromaDB-backed and memory-cached vector database for caching tool embeddings
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ChromaClient, AdminClient } from 'chromadb';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_FILE_PATH = path.join(__dirname, '../../data/tool_embeddings.json');

const dummyEmbeddingFunction = {
	generate: async (texts) => {
		// Returns empty arrays; we always generate and pass custom embeddings manually
		return texts.map(() => []);
	}
};

function extractToolMeta(tool) {
	const name = tool.function?.name || tool.name || '';
	const description = tool.function?.description || tool.description || '';
	const parameters = tool.function?.parameters || tool.parameters || tool.inputSchema || {};
	return { name, description, parameters };
}

export class VectorDB {
	constructor() {
		this.toolsCache = new Map(); // key: toolName -> { tool, embedding, embeddingModel }
		this.collection = null;
	}

	async connect() {
		try {
			const chromaUrl = env.CHROMA_URL || 'http://localhost:8000';
			logger.info(`Connecting to Chroma DB for tools database at: ${chromaUrl}`);
			
			let host = 'localhost';
			let port = 8000;
			let ssl = false;
			try {
				const parsedUrl = new URL(chromaUrl);
				host = parsedUrl.hostname;
				port = parsedUrl.port ? parseInt(parsedUrl.port, 10) : (parsedUrl.protocol === 'https:' ? 443 : 80);
				ssl = parsedUrl.protocol === 'https:';
			} catch (e) {
				logger.warn(`Failed to parse CHROMA_URL: ${chromaUrl}, falling back to defaults.`);
			}

			// Ensure tools_db database exists
			const admin = new AdminClient({ host, port, ssl });
			try {
				await admin.createDatabase({ name: 'tools_db', tenant: 'default_tenant' });
				logger.info("Chroma database 'tools_db' created/verified.");
			} catch (e) {
				// Ignore if already exists
			}

			// Connect targeting tools_db database
			const chroma = new ChromaClient({ host, port, ssl, database: 'tools_db' });
			
			this.collection = await chroma.getOrCreateCollection({
				name: 'tools',
				metadata: { "hnsw:space": "cosine" },
				embeddingFunction: dummyEmbeddingFunction
			});

			const count = await this.collection.count();

			// If Chroma is empty, seed from local JSON file if it exists
			if (count === 0 && fs.existsSync(DB_FILE_PATH)) {
				logger.info(`Seeding Chroma tool_embeddings from local JSON file: ${DB_FILE_PATH}`);
				const rawData = fs.readFileSync(DB_FILE_PATH, 'utf8');
				if (rawData.trim()) {
					const data = JSON.parse(rawData);
					if (data.length > 0) {
						logger.info(`Seeding ${data.length} tool embeddings to Chroma...`);
						for (const item of data) {
							const name = item.name;
							const tool = item.tool;
							const embedding = item.embedding;
							const embeddingModel = item.embeddingModel || 'default';
							const document = `Tool: ${name}. Description: ${tool.function?.description || tool.description || ''}`;

							try {
								await this.collection.add({
									ids: [name],
									embeddings: [embedding],
									metadatas: [{
										tool: JSON.stringify(tool),
										embeddingModel
									}],
									documents: [document]
								});
							} catch (addErr) {
								if (addErr.message.includes('dimension') || addErr.message.includes('dimensionality')) {
									logger.warn('Chroma tools dimension mismatch on seed. Clearing and retrying...');
									await this.clear();
									await this.collection.add({
										ids: [name],
										embeddings: [embedding],
										metadatas: [{
											tool: JSON.stringify(tool),
											embeddingModel
										}],
										documents: [document]
									});
								} else {
									throw addErr;
								}
							}

							this.toolsCache.set(name, { tool, embedding, embeddingModel });
						}
						logger.info(`Successfully seeded tool embeddings to Chroma.`);
					}
				}
			}

			// Load all documents from Chroma into in-memory cache
			const response = await this.collection.get({
				include: ['embeddings', 'metadatas', 'documents']
			});

			if (response && response.ids) {
				for (let i = 0; i < response.ids.length; i++) {
					const name = response.ids[i];
					const embedding = response.embeddings[i];
					const metadata = response.metadatas[i];
					if (metadata && metadata.tool) {
						this.toolsCache.set(name, {
							tool: JSON.parse(metadata.tool),
							embedding,
							embeddingModel: metadata.embeddingModel
						});
					}
				}
			}
			logger.info(`Loaded ${this.toolsCache.size} cached tool embeddings from Chroma DB tools_db.`);
		} catch (error) {
			logger.error(`Failed to load vector database from Chroma tools_db: ${error.message}`);
		}
	}

	async save() {
		try {
			if (!this.collection) {
				logger.warn('Chroma tools collection not initialized. Cannot save.');
				return;
			}

			// Upsert all cached items to Chroma
			for (const [name, val] of this.toolsCache.entries()) {
				const document = `Tool: ${name}. Description: ${val.tool.function?.description || val.tool.description || ''}`;
				try {
					await this.collection.upsert({
						ids: [name],
						embeddings: [val.embedding],
						metadatas: [{
							tool: JSON.stringify(val.tool),
							embeddingModel: val.embeddingModel || 'default'
						}],
						documents: [document]
					});
				} catch (upsertErr) {
					if (upsertErr.message.includes('dimension') || upsertErr.message.includes('dimensionality')) {
						logger.warn('Chroma tools dimension mismatch on save. Clearing and retrying...');
						await this.clear();
						await this.collection.upsert({
							ids: [name],
							embeddings: [val.embedding],
							metadatas: [{
								tool: JSON.stringify(val.tool),
								embeddingModel: val.embeddingModel || 'default'
							}],
							documents: [document]
						});
					} else {
						throw upsertErr;
					}
				}
			}
			logger.info(`Saved ${this.toolsCache.size} tool embeddings to Chroma DB tools_db.`);
		} catch (error) {
			logger.error(`Failed to save vector database to Chroma tools_db: ${error.message}`);
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
			const chromaUrl = env.CHROMA_URL || 'http://localhost:8000';
			
			let host = 'localhost';
			let port = 8000;
			let ssl = false;
			try {
				const parsedUrl = new URL(chromaUrl);
				host = parsedUrl.hostname;
				port = parsedUrl.port ? parseInt(parsedUrl.port, 10) : (parsedUrl.protocol === 'https:' ? 443 : 80);
				ssl = parsedUrl.protocol === 'https:';
			} catch (e) {
				logger.warn(`Failed to parse CHROMA_URL: ${chromaUrl}, falling back to defaults.`);
			}

			const chroma = new ChromaClient({ host, port, ssl, database: 'tools_db' });
			try {
				await chroma.deleteCollection({ name: 'tools' });
			} catch (e) {
				// Ignore if collection didn't exist
			}
			this.collection = await chroma.getOrCreateCollection({
				name: 'tools',
				metadata: { "hnsw:space": "cosine" },
				embeddingFunction: dummyEmbeddingFunction
			});
			logger.info("Cleared and recreated tools collection in Chroma DB 'tools_db'.");
		} catch (error) {
			logger.error(`Failed to clear tool embeddings in Chroma DB: ${error.message}`);
		}
	}
}
