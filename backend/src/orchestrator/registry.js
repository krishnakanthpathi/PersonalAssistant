/**
 * Single entry-point for Local, MCP, and RAG tools
 */

import * as macTools from '../tools/mac/index.js';
import { rdsQueryTool } from '../tools/rdsQuery.js';
import { mcpManager } from '../mcp/mcpManager.js';

import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { OKFEngine } from '../rag/okfEngine.js';

class ToolRegistry {
	constructor() {
		this.tools = new Map();
	}

	initialize() {
		for (const tool of Object.values(macTools)) {
			if (tool && tool.definition && tool.definition.name) {
				this.tools.set(tool.definition.name, tool);
			}
		}
		if (rdsQueryTool && rdsQueryTool.definition && rdsQueryTool.definition.name) {
			this.tools.set(rdsQueryTool.definition.name, rdsQueryTool);
		}
		logger.info(`Initialized ToolRegistry with ${this.tools.size} local tools.`);
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

		// 3. Gather custom dynamic skills from MongoDB
		let mappedDbSkills = [];
		try {
			const { getDB } = await import('../config/mongodb.js');
			const db = getDB();
			const dbSkills = await db.collection('skills').find().toArray();
			mappedDbSkills = dbSkills.map(skill => ({
				type: 'function',
				function: {
					name: skill.name,
					description: skill.description,
					parameters: skill.parameters
				}
			}));
		} catch (err) {
			logger.warn(`Could not load custom dynamic skills for LLM tools list: ${err.message}`);
		}

		return [...localTools, ...mappedMcpTools, ...mappedDbSkills];
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

		// Directly match search terms in tool names & descriptions (enables dynamic skill search)
		const queryTerms = query.toLowerCase().split(/\W+/).filter(t => t.length > 2);
		allTools.forEach(tool => {
			const name = (tool.function?.name || tool.name || '').toLowerCase();
			const desc = (tool.function?.description || tool.description || '').toLowerCase();
			const matches = queryTerms.some(term => name.includes(term) || desc.includes(term));
			if (matches) {
				activeToolNames.add(tool.function?.name || tool.name);
			}
		});

		let selectedTools = allTools.filter(tool => {
			const toolName = tool.function?.name || tool.name;
			return activeToolNames.has(toolName);
		});

		// Fallback to first 12 tools if no specific tool group matched
		if (selectedTools.length === 0) {
			selectedTools = allTools.slice(0, 12);
		}

		const CORE_TOOLS = new Set([
			'read_graph',
			'search_nodes',
			'open_nodes',
			'create_entities',
			'add_observations',
			'open_application',
			'close_application',
			'run_applescript',
			'open_url',
			'analyze_image',
			'take_screenshot',
			'get_knowledge_document',
			'update_knowledge_document'
		]);

		for (const tool of allTools) {
			const toolName = tool.function?.name || tool.name;
			if (CORE_TOOLS.has(toolName)) {
				const alreadyIncluded = selectedTools.some(t => (t.function?.name || t.name) === toolName);
				if (!alreadyIncluded) {
					selectedTools.push(tool);
				}
			}
		}

		// Prevent prompt bloat by capping matching tools (excluding core fallback tools)
		const maxToolsLimit = env.MAX_RELEVANT_TOOLS || 12;
		if (selectedTools.length > maxToolsLimit + CORE_TOOLS.size) {
			const matchesOnly = selectedTools.filter(t => !CORE_TOOLS.has(t.function?.name || t.name));
			const coreOnly = selectedTools.filter(t => CORE_TOOLS.has(t.function?.name || t.name));
			selectedTools = [...matchesOnly.slice(0, maxToolsLimit), ...coreOnly];
		}

		// Group-based tool expansion: if at least one tool from a group is retrieved, include other essential tools from that group.
		const groups = [
			{
				name: 'filesystem',
				match: (t, name) => name.startsWith('fs_') || t.serverName === 'filesystem',
				essential: new Set([
					'fs_list', 'fs_read', 'fs_write', 'fs_make_dir', 'fs_move', 'fs_delete',
					'list_directory', 'read_file', 'write_file', 'create_directory', 'move_file', 'remove_file'
				])
			},
			{
				name: 'notion',
				match: (t, name) => name.startsWith('notion_') || t.serverName === 'notion',
				essential: new Set([
					'notion_search', 'notion_get_page', 'notion_create_page', 'notion_update_page', 'notion_append_block'
				])
			},
			{
				name: 'gmail',
				match: (t, name) => name.startsWith('gmail_') || name.includes('mail') || t.serverName === 'gmail',
				essential: new Set([
					'search_threads', 'get_thread', 'send_draft', 'create_draft', 'reply_to_thread'
				])
			},
			{
				name: 'calendar',
				match: (t, name) => name.startsWith('calendar_') || t.serverName === 'google-calendar',
				essential: new Set([
					'list_events', 'get_event', 'create_event', 'update_event', 'delete_event'
				])
			}
		];

		const activeGroups = new Set();
		for (const tool of selectedTools) {
			const toolName = tool.function?.name || tool.name;
			for (const group of groups) {
				if (group.match(tool, toolName)) {
					activeGroups.add(group.name);
				}
			}
		}

		for (const groupName of activeGroups) {
			const group = groups.find(g => g.name === groupName);
			for (const tool of allTools) {
				const toolName = tool.function?.name || tool.name;
				if (group.essential.has(toolName)) {
					const alreadyIncluded = selectedTools.some(t => (t.function?.name || t.name) === toolName);
					if (!alreadyIncluded) {
						selectedTools.push(tool);
					}
				}
			}
		}

		return selectedTools;
	}

	async callTool(name, args, toolContext = null) {
		// 1. Check local tools first
		const localTool = this.tools.get(name);
		if (localTool) {
			return await localTool.execute(args, toolContext);
		}

		// 2. Fallback to MCP tools next
		const mcpTools = await mcpManager.getTools();
		const mcpTool = mcpTools.find(t => t.name === name);
		if (mcpTool) {
			const result = await mcpManager.callTool(mcpTool.serverName, name, args, toolContext);
			// Extract and return text content from standard MCP payload format
			if (result && result.content && result.content.length > 0) {
				return result.content.map(c => c.text).join('\n');
			}
			return JSON.stringify(result);
		}

		// 3. Fallback to custom dynamic skills from MongoDB
		try {
			const { getDB } = await import('../config/mongodb.js');
			const db = getDB();
			const skill = await db.collection('skills').findOne({ name });
			if (skill) {
				logger.info(`Executing custom dynamic skill: ${name}`);
				const { executeDynamicSkill } = await import('../utils/skillEvaluator.js');
				return await executeDynamicSkill(skill, args, toolContext);
			}
		} catch (err) {
			logger.error(`Failed to execute dynamic skill ${name}: ${err.message}`);
			throw err;
		}

		throw new Error(`Tool ${name} does not exist.`);
	}
}

export const registry = new ToolRegistry();
registry.initialize();