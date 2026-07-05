/**
 * Single entry-point for Local, MCP, and RAG tools
 */

import { volumeSetTool } from '../tools/mac/volumeSet.js';
import { mcpManager } from '../mcp/mcpManager.js';
import { env } from '../config/env.js';

class ToolRegistry {
	constructor() {
		this.tools = new Map();
	}

	initialize() {
		// Register the new setter tool
		this.tools.set(volumeSetTool.definition.name, volumeSetTool);
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