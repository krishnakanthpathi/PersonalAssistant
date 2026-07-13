/**
 * Single entry-point for Local, MCP, and RAG tools
 */

import { volumeSetTool } from '../tools/mac/volumeSet.js';
import { listApplicationsTool } from '../tools/mac/listApplications.js';
import { openApplicationTool } from '../tools/mac/openApplication.js';
import { screenshotTool } from '../tools/mac/screenshot.js';
import { closeApplicationTool } from '../tools/mac/closeApplication.js';
import { openUrlTool } from '../tools/mac/openUrl.js';
import { emptyTrashTool } from '../tools/mac/emptyTrash.js';
import { getSystemStatsTool } from '../tools/mac/getSystemStats.js';
import { lockScreenTool } from '../tools/mac/lockScreen.js';
import { getVolumeTool } from '../tools/mac/getVolume.js';
import { clipboardTool } from '../tools/mac/clipboard.js';
import { mediaControlTool } from '../tools/mac/mediaControl.js';
import { darkModeTool } from '../tools/mac/darkMode.js';
import { systemPowerTool } from '../tools/mac/systemPower.js';
import { wifiControlTool } from '../tools/mac/wifiControl.js';
import { keystrokeTool } from '../tools/mac/keystroke.js';
import { activeWindowTool } from '../tools/mac/activeWindow.js';
import { runAppleScriptTool } from '../tools/mac/runAppleScriptTool.js';
import { moveMouseTool } from '../tools/mac/moveMouseTool.js';
// import { getUIElementsTool } from '../tools/mac/getUIElements.js';
import { mouseClickTool } from '../tools/mac/mouseClick.js';
// import { annotateScreenTool } from '../tools/mac/annotateScreen.js';
import { timerTool } from '../tools/mac/timer.js';
import { rdsQueryTool } from '../tools/rdsQuery.js';
import { getAccessibilityTreeTool } from '../tools/mac/getAccessibilityTree.js';


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
		// Register local tools
		this.tools.set(volumeSetTool.definition.name, volumeSetTool);
		this.tools.set(listApplicationsTool.definition.name, listApplicationsTool);
		this.tools.set(openApplicationTool.definition.name, openApplicationTool);
		this.tools.set(screenshotTool.definition.name, screenshotTool);
		this.tools.set(closeApplicationTool.definition.name, closeApplicationTool);
		this.tools.set(openUrlTool.definition.name, openUrlTool);
		this.tools.set(emptyTrashTool.definition.name, emptyTrashTool);
		this.tools.set(getSystemStatsTool.definition.name, getSystemStatsTool);
		this.tools.set(lockScreenTool.definition.name, lockScreenTool);
		this.tools.set(getVolumeTool.definition.name, getVolumeTool);
		this.tools.set(clipboardTool.definition.name, clipboardTool);
		this.tools.set(mediaControlTool.definition.name, mediaControlTool);
		this.tools.set(darkModeTool.definition.name, darkModeTool);
		this.tools.set(systemPowerTool.definition.name, systemPowerTool);
		this.tools.set(wifiControlTool.definition.name, wifiControlTool);
		this.tools.set(keystrokeTool.definition.name, keystrokeTool);
		this.tools.set(activeWindowTool.definition.name, activeWindowTool);
		this.tools.set(runAppleScriptTool.definition.name, runAppleScriptTool);
		this.tools.set(moveMouseTool.definition.name, moveMouseTool);
		// this.tools.set(getUIElementsTool.definition.name, getUIElementsTool);
		this.tools.set(mouseClickTool.definition.name, mouseClickTool);
		// this.tools.set(annotateScreenTool.definition.name, annotateScreenTool);
		this.tools.set(timerTool.definition.name, timerTool);
		this.tools.set(rdsQueryTool.definition.name, rdsQueryTool);
		this.tools.set(getAccessibilityTreeTool.definition.name, getAccessibilityTreeTool);
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

		const currentModel = env.LLM_PROVIDER === 'openai'
			? (env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small')
			: (env.OLLAMA_EMBEDDING_MODEL || env.OLLAMA_MODEL || 'nomic-embed-text');

		try {
			// Find out which tools are outdated or not cached
			const toolsToEmbed = [];
			const toolsToEmbedTexts = [];

			for (const tool of allTools) {
				const toolName = tool.function?.name || tool.name;
				const isCached = this.vectorDb.isUpToDate(toolName, tool, currentModel);

				if (!isCached) {
					const description = tool.function?.description || tool.description || '';
					const textToEmbed = `Tool: ${toolName}. Description: ${description}`;
					toolsToEmbed.push(tool);
					toolsToEmbedTexts.push(textToEmbed);
				}
			}

			// Batch embed any new or modified tools
			if (toolsToEmbed.length > 0) {
				logger.info(`Generating embeddings for ${toolsToEmbed.length} new/updated tools using model: ${currentModel}...`);
				const embeddings = await this.embedder.embedBatch(toolsToEmbedTexts);
				for (let i = 0; i < toolsToEmbed.length; i++) {
					const tool = toolsToEmbed[i];
					const toolName = tool.function?.name || tool.name;
					this.vectorDb.set(toolName, tool, embeddings[i], currentModel);
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

			// Core UI tools that should always be present
			const CORE_TOOLS = new Set([
				'get_accessibility_tree',
				'move_mouse',
				'mouse_click',
				'keystroke_action',
				'run_applescript',
				'take_screenshot'
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

			logger.info(`RAG selected ${selectedTools.length} / ${allTools.length} tools (including core UI tools) for the user query.`);
			return selectedTools;
		} catch (error) {
			logger.error(`Error in getRelevantTools, returning all tools: ${error.message}`);
			return allTools;
		}
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

		throw new Error(`Tool ${name} does not exist.`);
	}
}

export const registry = new ToolRegistry();
registry.initialize();