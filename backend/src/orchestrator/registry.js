/**
 * Single entry-point for Local, MCP, and RAG tools
 */

import { rdsQueryTool } from '../tools/rdsQuery.js';
import { getKnowledgeDocumentTool, updateKnowledgeDocumentTool } from '../tools/okfTools.js';
import { createPrebuiltFormTool } from '../tools/prebuiltFormTools.js';
import { integrateMcpServerTool } from '../tools/mcpIntegrationTool.js';

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
		const searchTerms = [...queryTerms];
		queryTerms.forEach(term => {
			if (term.endsWith('s') && term.length > 3) {
				searchTerms.push(term.slice(0, -1));
			}
		});

		const matchedToolNames = new Set();
		if (searchTerms.length > 0) {
			allTools.forEach(tool => {
				const name = (tool.function?.name || tool.name || '').toLowerCase();
				const desc = (tool.function?.description || tool.description || '').toLowerCase();
				const matches = searchTerms.some(term => name.includes(term) || desc.includes(term));
				if (matches) {
					matchedToolNames.add(tool.function?.name || tool.name);
				}
			});
		}

		// Prioritize tools by OKF match order first, then append keyword-matched tools
		let selectedTools = [];
		const includedNames = new Set();

		// 1. Add tools matching OKF documents in order of match relevance
		matchedDocs.forEach(doc => {
			if (doc.type === 'tool_group' && Array.isArray(doc.frontmatter.tools)) {
				doc.frontmatter.tools.forEach(name => {
					if (!includedNames.has(name)) {
						const tool = allTools.find(t => (t.function?.name || t.name) === name);
						if (tool) {
							selectedTools.push(tool);
							includedNames.add(name);
						}
					}
				});
			}
		});

		// 2. Add keyword matched tools
		allTools.forEach(tool => {
			const name = tool.function?.name || tool.name;
			if (matchedToolNames.has(name) && !includedNames.has(name)) {
				selectedTools.push(tool);
				includedNames.add(name);
			}
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
				match: (t, name) => name.startsWith('notion_') || name.startsWith('API-') || t.serverName === 'notion',
				essential: new Set([
					'API-post-search', 'API-retrieve-a-page', 'API-post-page', 'API-patch-page', 'API-get-block-children', 'API-patch-block-children'
				])
			},
			{
				name: 'gmail',
				match: (t, name) => name.startsWith('gmail_') || name.includes('mail') || t.serverName === 'gmail',
				essential: new Set([
					'list_threads', 'get_thread', 'list_messages', 'get_message', 'send_message', 'create_draft', 'send_draft'
				])
			},
			{
				name: 'calendar',
				match: (t, name) => name.startsWith('calendar_') || t.serverName === 'google-calendar',
				essential: new Set([
					'list-events', 'get-event', 'create-event', 'update-event', 'delete-event', 'list-calendars'
				])
			},
			{
				name: 'terminal',
				match: (t, name) => name.includes('command') || name.includes('terminal') || t.serverName === 'terminal',
				essential: new Set([
					'execute_command', 'change_directory', 'get_current_directory', 'get_allowed_commands'
				])
			},
			{
				name: 'input_simulation',
				match: (t, name) => name.startsWith('mouse_') || name.startsWith('key_') || name.includes('keystroke') || name === 'type_text',
				essential: new Set([
					'mouse_move', 'mouse_click', 'mouse_drag', 'mouse_scroll', 'key_press', 'type_text', 'keystroke_action'
				])
			},
			{
				name: 'system_automation',
				match: (t, name) => name.includes('volume') || name.includes('screen') || name.includes('dark_mode') || name.includes('app'),
				essential: new Set([
					'volume_set', 'get_volume', 'take_screenshot', 'set_dark_mode', 'open_application', 'close_application', 'get_system_stats'
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
			let result = await mcpManager.callTool(mcpTool.serverName, name, args, toolContext);

			// Intercept and clean up Gmail/Calendar payloads to avoid token bloat
			if (mcpTool.serverName === 'gmail') {
				result = cleanGmailMcpResult(name, result);
			}

			// Extract and return text content from standard MCP payload format
			if (result && result.content && result.content.length > 0) {
				return result.content.map(c => c.text).join('\n');
			}
			return JSON.stringify(result);
		}

		throw new Error(`Tool ${name} does not exist.`);
	}
}

function cleanGmailMcpResult(toolName, result) {
	if (!result || !Array.isArray(result.content)) {
		return result;
	}

	result.content.forEach(c => {
		if (c.type === 'text' && typeof c.text === 'string') {
			try {
				const data = JSON.parse(c.text);
				const cleaned = cleanGmailData(data, toolName);
				c.text = JSON.stringify(cleaned, null, 2);
			} catch (e) {
				// Not valid JSON or parsing failed, leave as is
			}
		}
	});

	return result;
}

function cleanGmailData(data, toolName) {
	if (Array.isArray(data)) {
		return data.map(item => cleanGmailData(item, toolName));
	}
	if (typeof data !== 'object' || data === null) {
		return data;
	}

	const cleaned = { ...data };

	// Clean headers if present
	if (cleaned.payload && Array.isArray(cleaned.payload.headers)) {
		const ALLOWED_HEADERS = new Set(['from', 'to', 'subject', 'date', 'cc', 'bcc', 'reply-to']);
		cleaned.payload.headers = cleaned.payload.headers.filter(h =>
			h && h.name && ALLOWED_HEADERS.has(h.name.toLowerCase())
		);
	}

	// Recursively clean parts if present
	if (cleaned.payload && Array.isArray(cleaned.payload.parts)) {
		cleaned.payload.parts = cleanParts(cleaned.payload.parts);
	}

	if (Array.isArray(cleaned.parts)) {
		cleaned.parts = cleanParts(cleaned.parts);
	}

	// If it's a thread, it might have a messages array
	if (Array.isArray(cleaned.messages)) {
		cleaned.messages = cleaned.messages.map(msg => cleanGmailData(msg, toolName));
	}

	// Remove raw fields
	delete cleaned.raw;

	return cleaned;
}

function cleanParts(parts) {
	return parts.map(part => {
		const cleanedPart = { ...part };
		if (cleanedPart.headers && Array.isArray(cleanedPart.headers)) {
			const ALLOWED_HEADERS = new Set(['from', 'to', 'subject', 'date', 'cc', 'bcc', 'reply-to', 'content-type']);
			cleanedPart.headers = cleanedPart.headers.filter(h =>
				h && h.name && ALLOWED_HEADERS.has(h.name.toLowerCase())
			);
		}
		if (Array.isArray(cleanedPart.parts)) {
			cleanedPart.parts = cleanParts(cleanedPart.parts);
		}
		return cleanedPart;
	});
}

export const registry = new ToolRegistry();
registry.initialize();