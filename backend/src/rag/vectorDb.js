/**
 * Simple in-memory and JSON-file-backed vector database for caching tool embeddings
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../utils/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_FILE_PATH = path.join(__dirname, '../../data/tool_embeddings.json');

export class VectorDB {
	constructor() {
		this.toolsCache = new Map(); // key: toolName -> { tool, embedding }
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
								embedding: item.embedding
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
				embedding: val.embedding
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

	set(name, tool, embedding) {
		this.toolsCache.set(name, { tool, embedding });
	}

	isUpToDate(name, toolDef) {
		const cached = this.toolsCache.get(name);
		if (!cached) return false;
		
		const cachedDef = cached.tool;
		// Check description and function parameters
		const descriptionMatch = (cachedDef.description || '') === (toolDef.description || '');
		
		// Stringify check for parameter schema to capture edits to parameters
		const cachedParams = cachedDef.parameters || cachedDef.inputSchema || {};
		const currentParams = toolDef.parameters || toolDef.inputSchema || {};
		const parametersMatch = JSON.stringify(cachedParams) === JSON.stringify(currentParams);

		return descriptionMatch && parametersMatch;
	}

	getAll() {
		return Array.from(this.toolsCache.values());
	}

	clear() {
		this.toolsCache.clear();
	}
}
