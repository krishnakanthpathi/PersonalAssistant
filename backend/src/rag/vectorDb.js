/**
 * Simple in-memory and JSON-file-backed vector database for caching tool embeddings
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
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
			const dir = path.dirname(DB_FILE_PATH);
			if (!fs.existsSync(dir)) {
				fs.mkdirSync(dir, { recursive: true });
			}
			if (fs.existsSync(DB_FILE_PATH)) {
				const rawData = fs.readFileSync(DB_FILE_PATH, 'utf8');
				if (rawData.trim()) {
					const data = JSON.parse(rawData);
					for (const item of data) {
						if (item.name && item.tool && Array.isArray(item.embedding)) {
							this.toolsCache.set(item.name, {
								tool: item.tool,
								embedding: item.embedding,
								embeddingModel: item.embeddingModel || 'default'
							});
						}
					}
					logger.info(`Loaded ${this.toolsCache.size} cached tool embeddings from disk.`);
				}
			}
		} catch (error) {
			logger.error(`Failed to load vector database from disk: ${error.message}`);
		}
	}

	async save() {
		try {
			const dir = path.dirname(DB_FILE_PATH);
			if (!fs.existsSync(dir)) {
				fs.mkdirSync(dir, { recursive: true });
			}
			const data = Array.from(this.toolsCache.entries()).map(([name, val]) => ({
				name,
				tool: val.tool,
				embedding: val.embedding,
				embeddingModel: val.embeddingModel
			}));
			fs.writeFileSync(DB_FILE_PATH, JSON.stringify(data, null, 2), 'utf8');
			logger.info(`Saved ${data.length} tool embeddings to disk.`);
		} catch (error) {
			logger.error(`Failed to save vector database to disk: ${error.message}`);
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

	clear() {
		this.toolsCache.clear();
	}
}

