/**
 * Vector generation (via OpenAI or Local Ollama)
 */
import OpenAI from 'openai';
import axios from 'axios';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

export class Embedder {
	constructor() {
		this.provider = env.LLM_PROVIDER;
		if (this.provider === 'openai') {
			this.openai = new OpenAI({
				apiKey: env.OPENAI_API_KEY,
				baseURL: env.OPENAI_BASE_URL || undefined
			});
		}
	}

	async embed(text) {
		if (!text || typeof text !== 'string' || text.trim() === '') {
			return [];
		}
		try {
			if (this.provider === 'openai') {
				const response = await this.openai.embeddings.create({
					model: env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small',
					input: text
				});
				return response.data[0].embedding;
			} else {
				// Ollama embeddings API
				const response = await axios.post(`${env.OLLAMA_URL}/api/embeddings`, {
					model: env.OLLAMA_EMBEDDING_MODEL || env.OLLAMA_MODEL || 'nomic-embed-text',
					prompt: text
				});
				return response.data.embedding;
			}
		} catch (error) {
			logger.error(`Embedding generation failed: ${error.message}`);
			throw error;
		}
	}

	async embedBatch(texts) {
		if (!texts || !Array.isArray(texts) || texts.length === 0) {
			return [];
		}
		try {
			if (this.provider === 'openai') {
				const response = await this.openai.embeddings.create({
					model: env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small',
					input: texts
				});
				return response.data.map(d => d.embedding);
			} else {
				// Ollama parallel requests for batch embedding
				const promises = texts.map(text =>
					axios.post(`${env.OLLAMA_URL}/api/embeddings`, {
						model: env.OLLAMA_EMBEDDING_MODEL || env.OLLAMA_MODEL || 'nomic-embed-text',
						prompt: text
					}).then(res => res.data.embedding)
				);
				return await Promise.all(promises);
			}

		} catch (error) {
			logger.error(`Batch embedding generation failed: ${error.message}`);
			throw error;
		}
	}
}
