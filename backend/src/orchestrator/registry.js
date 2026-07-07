/**
 * Single entry-point for Local, MCP, and RAG tools
 */

import { volumeSetTool } from '../tools/mac/volumeSet.js';
import { mcpManager } from '../mcp/mcpManager.js';
import { env } from '../config/env.js';
import { Embedder } from '../rag/embedder.js';
import { VectorDB } from '../rag/vectorDb.js';
import { rankTools } from '../rag/pipeline.js';
import { logger } from '../utils/logger.js';

class ToolRegistry {
	constructor() {
		this.tools = new Map();
		this.embedder = new Embedder();
		this.vectorDb = new VectorDB();
		this.dbInitialized = false;
	}

	initialize() {
		// Register the new setter tool
		this.tools.set(volumeSetTool.definition.name, volumeSetTool);
	}

	// Ensure database connection is loaded
	async ensureDbLoaded() {
		if (!this.dbInitialized) {
			await this.vectorDb.connect();
			this.dbInitialized = true;
		}
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

		// 2. Gather MCP tools from connected servers
		const mcpTools = await mcpManager.getTools();
		const mappedMcpTools = mcpTools.map(tool => ({
			type: 'function',
			function: {
				name: tool.name,
				description: tool.description,
				parameters: tool.inputSchema // Map MCP inputSchema to OpenAI/Ollama parameters key
			}
		}));

		return [...localTools, ...mappedMcpTools];
	}

	// Dynamic filtering of tools based on RAG relevance to query
	async getRelevantTools(query) {
		await this.ensureDbLoaded();

		// Fetch all currently active tools
		const allTools = await this.getOllamaTools();

		if (!query || typeof query !== 'string' || query.trim() === '') {
			return allTools;
		}

		try {
			// Find out which tools are outdated or not cached
			const toolsToEmbed = [];
			const toolsToEmbedTexts = [];

			for (const tool of allTools) {
				const toolName = tool.function?.name || tool.name;
				const isCached = this.vectorDb.isUpToDate(toolName, tool);

				if (!isCached) {
					const description = tool.function?.description || tool.description || '';
					const textToEmbed = `Tool: ${toolName}. Description: ${description}`;
					toolsToEmbed.push(tool);
					toolsToEmbedTexts.push(textToEmbed);
				}
			}

			// Batch embed any new or modified tools
			if (toolsToEmbed.length > 0) {
				logger.info(`Generating embeddings for ${toolsToEmbed.length} new/updated tools...`);
				const embeddings = await this.embedder.embedBatch(toolsToEmbedTexts);
				for (let i = 0; i < toolsToEmbed.length; i++) {
					const tool = toolsToEmbed[i];
					const toolName = tool.function?.name || tool.name;
					this.vectorDb.set(toolName, tool, embeddings[i]);
				}
				// Save updated cache to disk
				await this.vectorDb.save();
			}

			// Generate embedding for the user query
			let queryEmbedding = null;
			try {
				queryEmbedding = await this.embedder.embed(query);
			} catch (err) {
				logger.error(`Failed to embed query "${query}", falling back to keyword search: ${err.message}`);
			}

			// Rank all tools using RAG
			const cachedToolsList = this.vectorDb.getAll();
			
			// Filter tools list to only include tools that are currently registered and active
			const availableToolNames = new Set(allTools.map(t => t.function?.name || t.name));
			const activeCachedTools = cachedToolsList.filter(item => {
				const name = item.tool.function?.name || item.tool.name;
				return availableToolNames.has(name);
			});

			const selectedTools = rankTools(
				query,
				queryEmbedding,
				activeCachedTools,
				env.TOOL_SIMILARITY_THRESHOLD,
				env.MAX_RELEVANT_TOOLS
			);

			logger.info(`RAG selected ${selectedTools.length} / ${allTools.length} tools for the user query.`);
			return selectedTools;
		} catch (error) {
			logger.error(`Error in getRelevantTools, returning all tools: ${error.message}`);
			return allTools;
		}
	}

	async callTool(name, args) {
		// 1. Check local tools first
		const localTool = this.tools.get(name);
		if (localTool) {
			return await localTool.execute(args);
		}

		// 2. Fallback to MCP tools next
		const mcpTools = await mcpManager.getTools();
		const mcpTool = mcpTools.find(t => t.name === name);
		if (mcpTool) {
			const result = await mcpManager.callTool(mcpTool.serverName, name, args);
			// Extract and return text content from standard MCP payload format
			if (result && result.content && result.content.length > 0) {
				return result.content.map(c => c.text).join('\n');
			}
			return JSON.stringify(result);
		}

		throw new Error(`Tool ${name} does not exist.`);
	}
}

export const registry = new ToolRegistry();
registry.initialize();