import OpenAI from 'openai';
import axios from 'axios';
import { env } from '../config/env.js';
import { logger } from './logger.js';

const embeddingCache = new Map();

/**
 * Computes cosine similarity between two numeric vectors.
 * @param {Array<number>} vecA 
 * @param {Array<number>} vecB 
 * @returns {number} Similarity score between 0.0 and 1.0
 */
export function cosineSimilarity(vecA, vecB) {
	if (!vecA || !vecB || vecA.length === 0 || vecB.length === 0) return 0;
	if (vecA.length !== vecB.length) return 0;

	let dotProduct = 0;
	let normA = 0;
	let normB = 0;

	for (let i = 0; i < vecA.length; i++) {
		dotProduct += vecA[i] * vecB[i];
		normA += vecA[i] * vecA[i];
		normB += vecB[i] * vecB[i];
	}

	if (normA === 0 || normB === 0) return 0;
	return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Generates an embedding vector for a given text prompt.
 * Uses configured EMBEDDING_PROVIDER (openai or ollama), falling back gracefully.
 * @param {string} text 
 * @returns {Promise<Array<number>|null>} Embedding vector or null if unavailable
 */
export async function getEmbedding(text) {
	if (!text || typeof text !== 'string' || text.trim() === '') {
		return null;
	}

	const cacheKey = text.trim();
	if (embeddingCache.has(cacheKey)) {
		return embeddingCache.get(cacheKey);
	}

	const provider = (env.EMBEDDING_PROVIDER || (env.OPENAI_API_KEY ? 'openai' : 'ollama')).toLowerCase();

	try {
		let vector = null;

		if (provider === 'openai' && env.OPENAI_API_KEY) {
			const targetKey = env.EMBEDDING_API_KEY || env.OPENAI_API_KEY;
			const targetUrl = (env.EMBEDDING_BASE_URL || env.OPENAI_BASE_URL || '').trim();
			const cleanUrl = (targetUrl && targetUrl !== 'default') ? targetUrl : undefined;

			const openai = new OpenAI({
				apiKey: targetKey,
				baseURL: cleanUrl
			});

			const modelName = env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small';
			const response = await openai.embeddings.create({
				model: modelName,
				input: cacheKey
			});

			if (response.data && response.data.length > 0) {
				vector = response.data[0].embedding;
			}
		} else {
			// Default to Ollama
			const targetUrl = env.EMBEDDING_BASE_URL || env.OLLAMA_URL || 'http://localhost:11434';
			const modelName = env.OLLAMA_EMBEDDING_MODEL || 'nomic-embed-text';

			const response = await axios.post(
				`${targetUrl}/api/embeddings`,
				{
					model: modelName,
					prompt: cacheKey
				},
				{ timeout: 5000 }
			);

			if (response.data && response.data.embedding) {
				vector = response.data.embedding;
			}
		}

		if (vector && Array.isArray(vector)) {
			embeddingCache.set(cacheKey, vector);
			return vector;
		}
	} catch (error) {
		logger.debug(`Embedding generation failed (${provider}): ${error.message}`);
	}

	return null;
}
