/**
 * ChromaDB-backed personal information vector database for long-term memory retrieval
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { ChromaClient, AdminClient } from 'chromadb';
import { env } from '../config/env.js';
import { Embedder } from './embedder.js';
import { logger } from '../utils/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MEMORY_FILE_PATH = path.join(__dirname, '../../data/memory.json');

const dummyEmbeddingFunction = {
	generate: async (texts) => {
		// Returns empty arrays; we always generate and pass custom embeddings manually
		return texts.map(() => []);
	}
};

export class PersonalInfoVectorDB {
	constructor() {
		this.collection = null;
		this.embedder = new Embedder();
	}

	async connect() {
		try {
			const chromaUrl = env.CHROMA_URL || 'http://localhost:8000';
			logger.info(`Connecting to Chroma DB for personal info database at: ${chromaUrl}`);
			
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

			// Ensure personal_db database exists
			const admin = new AdminClient({ host, port, ssl });
			try {
				await admin.createDatabase({ name: 'personal_db', tenant: 'default_tenant' });
				logger.info("Chroma database 'personal_db' created/verified.");
			} catch (e) {
				// Ignore if already exists
			}

			// Connect targeting personal_db database
			const chroma = new ChromaClient({ host, port, ssl, database: 'personal_db' });
			
			this.collection = await chroma.getOrCreateCollection({
				name: 'personal_info',
				metadata: { "hnsw:space": "cosine" },
				embeddingFunction: dummyEmbeddingFunction
			});
			logger.info("Connected to Chroma DB 'personal_db' collection successfully.");
		} catch (error) {
			logger.error(`Failed to connect to Chroma personal_info collection in personal_db: ${error.message}`);
			throw error;
		}
	}

	async syncFromMemoryJson() {
		if (!this.collection) {
			throw new Error('Chroma personal_info collection is not initialized. Call connect() first.');
		}

		if (!fs.existsSync(MEMORY_FILE_PATH)) {
			logger.warn(`Memory JSON file not found at: ${MEMORY_FILE_PATH}. Skipping sync.`);
			return;
		}

		try {
			logger.info(`Reading memory file: ${MEMORY_FILE_PATH}...`);
			const fileContent = await fs.promises.readFile(MEMORY_FILE_PATH, 'utf8');
			const lines = fileContent.split('\n').filter(line => line.trim() !== '');

			// 1. Parse and chunk all entity items from memory.json
			const entities = [];
			for (const line of lines) {
				try {
					const item = JSON.parse(line);
					if (item.type === 'entity' && item.name && Array.isArray(item.observations) && item.observations.length > 0) {
						const CHUNK_SIZE = 15; // Max observations per chunk to prevent context limits
						const name = item.name;
						const entityType = item.entityType || 'Thing';

						for (let chunkIdx = 0; chunkIdx * CHUNK_SIZE < item.observations.length; chunkIdx++) {
							const obsChunk = item.observations.slice(chunkIdx * CHUNK_SIZE, (chunkIdx + 1) * CHUNK_SIZE);
							const docText = `Entity: ${name} (${entityType})\nObservations:\n- ${obsChunk.join('\n- ')}`;
							const hash = crypto.createHash('md5').update(docText).digest('hex');
							const id = `entity:${name}:${chunkIdx}`;

							entities.push({
								id,
								name,
								entityType,
								docText,
								hash
							});
						}
					}
				} catch (e) {
					// Ignore invalid JSON lines
				}
			}

			logger.info(`Parsed and chunked into ${entities.length} entities from memory.json.`);

			// 2. Fetch existing items in Chroma to check content hashes
			let existingResponse = null;
			try {
				existingResponse = await this.collection.get({
					include: ['metadatas']
				});
			} catch (getErr) {
				logger.warn(`Failed to fetch existing items from Chroma: ${getErr.message}. Clearing and restarting...`);
				await this.clear();
			}

			const existingHashMap = new Map();
			if (existingResponse && existingResponse.ids) {
				for (let i = 0; i < existingResponse.ids.length; i++) {
					const id = existingResponse.ids[i];
					const metadata = existingResponse.metadatas[i];
					if (metadata && metadata.contentHash) {
						existingHashMap.set(id, metadata.contentHash);
					}
				}
			}

			// 3. Find which entities are new or updated
			const entitiesToEmbed = [];
			let skipCount = 0;

			for (const entity of entities) {
				const existingHash = existingHashMap.get(entity.id);
				if (!existingHash || existingHash !== entity.hash) {
					entitiesToEmbed.push(entity);
				} else {
					skipCount++;
				}
			}

			logger.info(`Chroma Sync Status: ${skipCount} chunks already up-to-date, ${entitiesToEmbed.length} chunks need sync.`);

			// 4. Ingest new/updated entities in batches to prevent API rate limits or excessive load
			if (entitiesToEmbed.length > 0) {
				const BATCH_SIZE = 50;
				for (let i = 0; i < entitiesToEmbed.length; i += BATCH_SIZE) {
					const batch = entitiesToEmbed.slice(i, i + BATCH_SIZE);
					logger.info(`Generating embeddings and uploading batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(entitiesToEmbed.length / BATCH_SIZE)}...`);

					const textsToEmbed = batch.map(e => e.docText);
					const embeddings = await this.embedder.embedBatch(textsToEmbed);

					const ids = batch.map(e => e.id);
					const metadatas = batch.map(e => ({
						name: e.name,
						entityType: e.entityType,
						contentHash: e.hash
					}));

					try {
						await this.collection.upsert({
							ids,
							embeddings,
							metadatas,
							documents: textsToEmbed
						});
					} catch (upsertErr) {
						if (upsertErr.message.includes('dimension') || upsertErr.message.includes('dimensionality')) {
							logger.warn('Chroma personal info dimension mismatch. Clearing and retrying...');
							await this.clear();
							await this.collection.upsert({
								ids,
								embeddings,
								metadatas,
								documents: textsToEmbed
							});
						} else {
							throw upsertErr;
						}
					}
				}
				logger.info(`Successfully synchronized ${entitiesToEmbed.length} chunks to Chroma DB personal_info.`);
			}
		} catch (error) {
			logger.error(`Error during syncFromMemoryJson: ${error.message}`);
			throw error;
		}
	}

	async query(queryEmbedding, limit = 5) {
		if (!this.collection) {
			throw new Error('Chroma personal_info collection is not initialized.');
		}
		try {
			const response = await this.collection.query({
				queryEmbeddings: [queryEmbedding],
				nResults: limit
			});
			return response;
		} catch (error) {
			logger.error(`Error querying Chroma personal_info collection in personal_db: ${error.message}`);
			throw error;
		}
	}

	async clear() {
		try {
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

			const chroma = new ChromaClient({ host, port, ssl, database: 'personal_db' });
			try {
				await chroma.deleteCollection({ name: 'personal_info' });
			} catch (e) {
				// Ignore if collection didn't exist
			}
			this.collection = await chroma.getOrCreateCollection({
				name: 'personal_info',
				metadata: { "hnsw:space": "cosine" },
				embeddingFunction: dummyEmbeddingFunction
			});
			logger.info("Cleared and recreated personal_info collection in Chroma DB 'personal_db'.");
		} catch (error) {
			logger.error(`Failed to clear personal info embeddings in Chroma DB: ${error.message}`);
		}
	}
}
