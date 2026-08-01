/**
 * Single entry-point for Local, MCP, and RAG tools
 */

import { rdsQueryTool } from '../tools/rdsQuery.js';
import { getKnowledgeDocumentTool, updateKnowledgeDocumentTool } from '../tools/okfTools.js';
import { createPrebuiltFormTool } from '../tools/prebuiltFormTools.js';
import { integrateMcpServerTool } from '../tools/mcpIntegrationTool.js';
import { getCurrentTimeTool } from '../tools/dateTimeTool.js';

import { mcpManager } from '../mcp/mcpManager.js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { OKFEngine } from '../okf/okfEngine.js';

class ToolRegistry {
	constructor() {
		this.tools = new Map();
	}

	initialize() {
		// Register core local tools
		this.tools.set(rdsQueryTool.definition.name, rdsQueryTool);
		this.tools.set(getKnowledgeDocumentTool.definition.name, getKnowledgeDocumentTool);
		this.tools.set(updateKnowledgeDocumentTool.definition.name, updateKnowledgeDocumentTool);
		this.tools.set(createPrebuiltFormTool.definition.name, createPrebuiltFormTool);
		this.tools.set(integrateMcpServerTool.definition.name, integrateMcpServerTool);
		this.tools.set(getCurrentTimeTool.definition.name, getCurrentTimeTool);
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
			},
			serverName: tool.serverName // Preserve serverName metadata
		}));

		return [...localTools, ...mappedMcpTools];
	}

	// Dynamic filtering of tools based on matched OKF catalog documents
	async getRelevantTools(query) {
		const allTools = await this.getOllamaTools();

		if (!query || typeof query !== 'string' || query.trim() === '') {
			return allTools;
		}

		// Ensure OKFEngine is loaded
		if (!OKFEngine.initialized) {
			await OKFEngine.initialize();
		}

		// Match prompt query against OKF documents
		const matchedDocs = OKFEngine.match(query);

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

		// Directly match search terms in tool names & descriptions (enables dynamic skill search)
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

		const filteredTools = allTools.filter(t => {
			const name = (t.function?.name || t.name || '').toLowerCase();
			const desc = (t.function?.description || t.description || '').toLowerCase();

			// 1. Keep if listed in catalog frontmatter
			if (activeToolNames.has(t.function?.name || t.name)) {
				return true;
			}

			// 2. Keep if query terms match tool name or description
			for (const term of queryTerms) {
				if (name.includes(term) || desc.includes(term)) {
					return true;
				}
			}

			return false;
		});

		// Fallback: If filtering prunes everything, return all tools
		return filteredTools.length > 0 ? filteredTools : allTools;
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