/**
 * Coordinates: Ingest -> Vectorize -> Store -> Query
 * Also manages similarity calculations and hybrid scoring for tools selection.
 */
import { logger } from '../utils/logger.js';

/**
 * Calculates cosine similarity between two vectors
 */
export function cosineSimilarity(vecA, vecB) {
	if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
	let dotProduct = 0.0;
	let normA = 0.0;
	let normB = 0.0;
	for (let i = 0; i < vecA.length; i++) {
		dotProduct += vecA[i] * vecB[i];
		normA += vecA[i] * vecA[i];
		normB += vecB[i] * vecB[i];
	}
	if (normA === 0.0 || normB === 0.0) return 0;
	return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export function getKeywordScore(query, toolName, toolDesc) {
	if (!query) return 0;
	const queryTerms = new Set(query.toLowerCase().split(/\W+/).filter(Boolean));
	const toolTerms = (toolName + ' ' + toolDesc).toLowerCase().split(/\W+/).filter(Boolean);
	if (toolTerms.length === 0) return 0;

	let matches = 0;
	const matchedTerms = new Set();
	for (const term of toolTerms) {
		if (queryTerms.has(term) && !matchedTerms.has(term)) {
			matches++;
			matchedTerms.add(term);
		}
	}
	return matches / toolTerms.length;
}

/**
 * Ranks tools based on hybrid scoring (semantic embedding + keyword overlap)
 */
export function rankTools(query, queryEmbedding, cachedTools, threshold = 0.2, maxResults = 10) {
	if (!cachedTools || cachedTools.length === 0) return [];

	const scored = cachedTools.map(item => {
		let semanticScore = 0;
		if (queryEmbedding && item.embedding && item.embedding.length > 0) {
			semanticScore = cosineSimilarity(queryEmbedding, item.embedding);
		}

		const toolName = item.tool.function?.name || item.tool.name || '';
		const toolDesc = item.tool.function?.description || item.tool.description || '';
		const keywordScore = getKeywordScore(query, toolName, toolDesc);

		// Hybrid score: 70% semantic, 30% keyword overlap
		const score = (semanticScore * 0.7) + (keywordScore * 0.3);

		return {
			tool: item.tool,
			semanticScore,
			keywordScore,
			score
		};
	});

	// Sort descending by hybrid score
	scored.sort((a, b) => b.score - a.score);

	logger.info(`Tool ranking results for query "${query}":`);
	for (const item of scored.slice(0, 10)) {
		const name = item.tool.function?.name || item.tool.name;
		logger.info(`  - ${name}: score=${item.score.toFixed(4)} (semantic=${item.semanticScore.toFixed(4)}, keyword=${item.keywordScore.toFixed(4)})`);
	}

	// Filter by threshold
	let filtered = scored.filter(item => item.score >= threshold);

	// Fallback 1: Ensure we always return at least 3 tools if they have any positive match score
	if (filtered.length < 3 && scored.length > 0) {
		filtered = scored.filter(item => item.score > 0).slice(0, 3);
	}

	// Fallback 2: If no matches at all, return the top 3 overall tools so LLM has a basic set to work with
	if (filtered.length === 0 && scored.length > 0) {
		filtered = scored.slice(0, Math.min(3, scored.length));
	}

	return filtered.slice(0, maxResults).map(item => {
		const tool = item.tool;
		tool.score = item.score;
		return tool;
	});
}

export class RAGPipeline {
	async processDocument(filePath) {
		logger.info(`Ingesting document: ${filePath}`);
	}

	async query(queryString) {
		logger.info(`Querying vector database for: ${queryString}`);
	}
}
