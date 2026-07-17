/**
 * Vector generation (via OpenAI or Local Ollama)
 */
import OpenAI from 'openai';
import axios from 'axios';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

const EMBED_TIMEOUT_MS = 15000; // 15 second timeout for embedding calls

function withTimeout(promise, ms, label) {
	return Promise.race([
		promise,
		new Promise((_, reject) =>
			setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
		)
	]);
}

export class Embedder {
	constructor() {
		this.provider = env.EMBEDDING_PROVIDER || (env.OPENAI_API_KEY ? 'openai' : 'ollama');
		logger.info(`[Embedder] Using provider: ${this.provider}`);
		if (this.provider === 'openai') {
			const baseURL = env.EMBEDDING_BASE_URL || 'https://api.openai.com/v1';
			logger.info(`[Embedder] OpenAI base URL: ${baseURL}`);
			this.openai = new OpenAI({
				apiKey: env.EMBEDDING_API_KEY || env.OPENAI_API_KEY,
				// Always use the real OpenAI API for embeddings unless EMBEDDING_BASE_URL is explicitly set.
				// Do NOT inherit OPENAI_BASE_URL — it may point to a non-OpenAI provider (e.g. AWS Bedrock, Grok)
				// that doesn't support the /embeddings endpoint.
				baseURL,
				timeout: EMBED_TIMEOUT_MS
			});
		}
	}

	async embed(text) {
		if (!text || typeof text !== 'string' || text.trim() === '') {
			return [];
		}
		try {
			if (this.provider === 'openai') {
				try {
					logger.info(`[Embedder] Calling OpenAI embed (single)...`);
					const response = await withTimeout(
						this.openai.embeddings.create({
							model: env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small',
							input: text
						}),
						EMBED_TIMEOUT_MS,
						'OpenAI embed'
					);
					logger.info(`[Embedder] OpenAI embed succeeded.`);
					return response.data[0].embedding;
				} catch (openaiError) {
					logger.warn(`OpenAI embedding failed, falling back to Ollama: ${openaiError.message}`);
					return await this.embedOllama(text);
				}
			} else {
				return await this.embedOllama(text);
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
				try {
					logger.info(`[Embedder] Calling OpenAI embedBatch for ${texts.length} texts...`);
					const response = await withTimeout(
						this.openai.embeddings.create({
							model: env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small',
							input: texts
						}),
						EMBED_TIMEOUT_MS * 2, // Double timeout for batch
						'OpenAI embedBatch'
					);
					logger.info(`[Embedder] OpenAI embedBatch succeeded.`);
					return response.data.map(d => d.embedding);
				} catch (openaiError) {
					logger.warn(`OpenAI batch embedding failed, falling back to Ollama: ${openaiError.message}`);
					return await this.embedBatchOllama(texts);
				}
			} else {
				return await this.embedBatchOllama(texts);
			}

		} catch (error) {
			logger.error(`Batch embedding generation failed: ${error.message}`);
			throw error;
		}
	}

	async embedOllama(text) {
		// CHANGED: Endpoint path updated to /api/embed
		const response = await axios.post(`${env.OLLAMA_URL}/api/embed`, {
			model: env.OLLAMA_EMBEDDING_MODEL || env.OLLAMA_MODEL || 'nomic-embed-text',
			input: text // Note: Ollama's /api/embed accepts 'input' or 'prompt'
		}, { timeout: EMBED_TIMEOUT_MS });

		// Ollama returns an array of embeddings inside an 'embeddings' field
		return response.data.embeddings[0];
	}

	async embedBatchOllama(texts) {
		// CHANGED: Endpoint path updated to /api/embed
		const promises = texts.map(text =>
			axios.post(`${env.OLLAMA_URL}/api/embed`, {
				model: env.OLLAMA_EMBEDDING_MODEL || env.OLLAMA_MODEL || 'nomic-embed-text',
				input: text
			}, { timeout: EMBED_TIMEOUT_MS }).then(res => res.data.embeddings[0])
		);
		return await Promise.all(promises);
	}

}
