/**
 * Single entry-point for Local, MCP, and RAG tools
 */

import { rdsQueryTool } from '../tools/rdsQuery.js';
import { createPrebuiltFormTool } from '../tools/prebuiltFormTools.js';
import { getCurrentTimeTool } from '../tools/dateTimeTool.js';
import { glmOcrTool } from '../tools/glmOcrTool.js';

import { mcpManager } from '../mcp/mcpManager.js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { OKFEngine } from '../okf/okfEngine.js';
import { getEmbedding, cosineSimilarity } from '../utils/embeddingService.js';

class ToolRegistry {
	constructor() {
		this.tools = new Map();
	}

	initialize() {
		// Register core local tools
		this.tools.set(rdsQueryTool.definition.name, rdsQueryTool);
		this.tools.set(createPrebuiltFormTool.definition.name, createPrebuiltFormTool);
		this.tools.set(getCurrentTimeTool.definition.name, getCurrentTimeTool);
		this.tools.set(glmOcrTool.definition.name, glmOcrTool);
	}

	// Dynamic, asynchronous fetch of all available tools (Local + MCP)
	async getOllamaTools() {
		// 1. Gather local tools
		const localTools = Array.from(this.tools.values()).map(tool => ({
			type: 'function',
			function: {
				name: tool.definition.name,
				description: tool.definition.description,
				parameters: tool.definition.parameters
			}
		}));

		// 2. Gather MCP tools from connected servers (excluding say_speech speaking tool)
		const mcpTools = await mcpManager.getTools();
		const mappedMcpTools = mcpTools
			.filter(tool => tool.name !== 'say_speech')
			.map(tool => ({
				type: 'function',
				function: {
					name: tool.name,
					description: tool.description,
					parameters: tool.inputSchema // Map MCP inputSchema to OpenAI/Ollama parameters key
				},
				serverName: tool.serverName // Preserve serverName metadata
			}));

		return [...localTools, ...mappedMcpTools];
	}

	// Dynamic filtering of tools based on matched OKF catalog documents & vector similarity
	async getRelevantTools(query) {
		const allTools = await this.getOllamaTools();

		if (!query || typeof query !== 'string' || query.trim() === '') {
			return allTools;
		}

		// Ensure OKFEngine is loaded
		if (!OKFEngine.initialized) {
			await OKFEngine.initialize();
		}

		// Generate query embedding for similarity search
		const queryEmbedding = await getEmbedding(query);

		// Match prompt query against OKF documents using hybrid matching (query string + embedding)
		const matchedDocs = OKFEngine.match(query, queryEmbedding);

		const activeToolNames = new Set();
		matchedDocs.forEach(doc => {
			if (doc.type === 'tool_group' && Array.isArray(doc.frontmatter.tools)) {
				doc.frontmatter.tools.forEach(name => activeToolNames.add(name));
			}
		});

		// Always keep all core local built-in tools active (non-MCP tools like create_prebuilt_form, etc.)
		for (const localToolName of this.tools.keys()) {
			activeToolNames.add(localToolName);
		}

		// Directly match search terms in tool names & descriptions
		const STOP_WORDS = new Set([
			'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'arent', 'as', 'at',
			'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by',
			'cant', 'cannot', 'could', 'couldnt',
			'did', 'didnt', 'do', 'does', 'doesnt', 'doing', 'dont', 'down', 'during',
			'each',
			'few', 'for', 'from', 'further',
			'get', 'had', 'hadnt', 'has', 'hasnt', 'have', 'havent', 'having', 'he', 'hed', 'hell', 'hes', 'her', 'here', 'heres', 'hers', 'herself', 'him', 'himself', 'his', 'how', 'hows',
			'i', 'id', 'ill', 'im', 'ive', 'if', 'in', 'into', 'is', 'isnt', 'it', 'its', 'itself',
			'lets',
			'me', 'more', 'most', 'mustnt', 'my', 'myself',
			'no', 'nor', 'not',
			'of', 'off', 'on', 'once', 'only', 'or', 'other', 'ought', 'our', 'ours', 'ourselves', 'out', 'over', 'own',
			'same', 'set', 'shant', 'she', 'shed', 'shell', 'shes', 'should', 'shouldnt', 'so', 'some', 'such',
			'than', 'that', 'thats', 'the', 'their', 'theirs', 'them', 'themselves', 'then', 'there', 'theres', 'these', 'they', 'theyd', 'theyll', 'theyre', 'theyve', 'this', 'those', 'through', 'to', 'too',
			'under', 'until', 'up', 'very',
			'was', 'wasnt', 'we', 'wed', 'well', 'were', 'weve', 'werent', 'what', 'whats', 'when', 'whens', 'where', 'wheres', 'which', 'while', 'who', 'whos', 'whom', 'why', 'whys', 'with', 'wont', 'would', 'wouldnt',
			'you', 'youd', 'youll', 'youre', 'youve', 'your', 'yours', 'yourself', 'yourselves'
		]);

		const queryTerms = query.toLowerCase().split(/\W+/).filter(t => t.length > 2 && !STOP_WORDS.has(t));

		// Vector similarity check across all tools using embedding
		const toolScores = await Promise.all(allTools.map(async (t) => {
			const toolName = (t.function?.name || t.name || '');
			const desc = (t.function?.description || t.description || '');

			// Check exact catalog match
			if (activeToolNames.has(toolName)) {
				return { tool: t, score: 10.0 };
			}

			let lexicalScore = 0;
			const nameLower = toolName.toLowerCase();
			const descLower = desc.toLowerCase();

			for (const term of queryTerms) {
				if (nameLower.includes(term) || descLower.includes(term)) {
					lexicalScore += 2;
				}
			}

			let vectorSimilarity = 0;
			if (queryEmbedding) {
				const toolEmbeddingText = `${toolName} ${desc}`;
				const toolEmbedding = await getEmbedding(toolEmbeddingText);
				if (toolEmbedding) {
					vectorSimilarity = cosineSimilarity(queryEmbedding, toolEmbedding);
				}
			}

			const totalScore = lexicalScore + (vectorSimilarity * 5.0);
			return { tool: t, score: totalScore, vectorSimilarity, lexicalScore };
		}));

		const threshold = env.TOOL_SIMILARITY_THRESHOLD || 0.25;
		const filtered = toolScores
			.filter(item => item.score > 1.0 || item.vectorSimilarity >= threshold)
			.sort((a, b) => b.score - a.score)
			.map(item => item.tool);

		// Fallback: If filtering prunes everything, return all tools
		return filtered.length > 0 ? filtered : allTools;
	}

	async executeTool(name, args, context) {
		// 1. Check local tools
		const localTool = this.tools.get(name);
		if (localTool) {
			return await localTool.execute(args, context);
		}

		// 2. Check MCP tools
		const result = await mcpManager.executeTool(name, args);
		return result;
	}

	async callTool(name, args, context) {
		return await this.executeTool(name, args, context);
	}
}

export const registry = new ToolRegistry();
registry.initialize();