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
import { keystrokeTool } from '../tools/mac/keystroke.js';
import { activeWindowTool } from '../tools/mac/activeWindow.js';
import { runAppleScriptTool } from '../tools/mac/runAppleScriptTool.js';
import { timerTool } from '../tools/mac/timer.js';
import { remindersTool } from '../tools/mac/reminders.js';
import { rdsQueryTool } from '../tools/rdsQuery.js';

import {
	listAppsTool,
	listWindowsTool,
	focusAppTool,
	focusWindowTool,
	moveWindowTool,
	resizeWindowTool,
	setSpaceTool
} from '../tools/mac/appWindowTools.js';
import {
	fsReadTool,
	fsReadManyTool,
	fsWriteTool,
	fsEditTool,
	fsWritePdfTool,
	fsListTool,
	fsStatTool,
	fsCopyTool,
	fsMoveTool,
	fsMakeDirTool,
	fsDeleteTool,
	fsWatchOnceTool,
	fsXattrGetTool,
	fsXattrSetTool
} from '../tools/mac/fsTools.js';
import {
	processRunTool,
	processStartTool,
	processReadOutputTool,
	processWriteInputTool,
	processTerminateTool,
	processListTool,
	processKillTool
} from '../tools/mac/processTools.js';
import {
	revealInFinderTool,
	getFinderSelectionTool,
	setFinderTagsTool,
	quickLookTool,
	moveToTrashTool,
	spotlightSearchTool
} from '../tools/mac/finderTools.js';
import {
	shortcutListTool,
	shortcutRunTool,
	waitMsTool
} from '../tools/mac/shortcutTools.js';
import {
	mouseMoveTool,
	mouseClickTool,
	mouseDragTool,
	mouseScrollTool,
	keyPressTool,
	typeTextTool
} from '../tools/mac/inputTools.js';
import {
	clipboardReadTool,
	clipboardWriteTool,
	notifyTool,
	promptUserTool,
	screenshotScreenTool,
	screenshotWindowTool
} from '../tools/mac/systemInfoTools.js';
import {
	mailTool,
	calendarTool,
	messagesTool,
	safariTool,
	notesTool,
	terminalTool
} from '../tools/mac/appIntegrationTools.js';
import {
	iphoneMirrorTool
} from '../tools/mac/iphoneMirrorTools.js';


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
		this.tools.set(keystrokeTool.definition.name, keystrokeTool);
		this.tools.set(activeWindowTool.definition.name, activeWindowTool);
		this.tools.set(runAppleScriptTool.definition.name, runAppleScriptTool);
		this.tools.set(timerTool.definition.name, timerTool);
		this.tools.set(remindersTool.definition.name, remindersTool);
		this.tools.set(rdsQueryTool.definition.name, rdsQueryTool);

		this.tools.set(listAppsTool.definition.name, listAppsTool);
		this.tools.set(listWindowsTool.definition.name, listWindowsTool);
		this.tools.set(focusAppTool.definition.name, focusAppTool);
		this.tools.set(focusWindowTool.definition.name, focusWindowTool);
		this.tools.set(moveWindowTool.definition.name, moveWindowTool);
		this.tools.set(resizeWindowTool.definition.name, resizeWindowTool);
		this.tools.set(setSpaceTool.definition.name, setSpaceTool);

		this.tools.set(fsReadTool.definition.name, fsReadTool);
		this.tools.set(fsReadManyTool.definition.name, fsReadManyTool);
		this.tools.set(fsWriteTool.definition.name, fsWriteTool);
		this.tools.set(fsEditTool.definition.name, fsEditTool);
		this.tools.set(fsWritePdfTool.definition.name, fsWritePdfTool);
		this.tools.set(fsListTool.definition.name, fsListTool);
		this.tools.set(fsStatTool.definition.name, fsStatTool);
		this.tools.set(fsCopyTool.definition.name, fsCopyTool);
		this.tools.set(fsMoveTool.definition.name, fsMoveTool);
		this.tools.set(fsMakeDirTool.definition.name, fsMakeDirTool);
		this.tools.set(fsDeleteTool.definition.name, fsDeleteTool);
		this.tools.set(fsWatchOnceTool.definition.name, fsWatchOnceTool);
		this.tools.set(fsXattrGetTool.definition.name, fsXattrGetTool);
		this.tools.set(fsXattrSetTool.definition.name, fsXattrSetTool);

		this.tools.set(processRunTool.definition.name, processRunTool);
		this.tools.set(processStartTool.definition.name, processStartTool);
		this.tools.set(processReadOutputTool.definition.name, processReadOutputTool);
		this.tools.set(processWriteInputTool.definition.name, processWriteInputTool);
		this.tools.set(processTerminateTool.definition.name, processTerminateTool);
		this.tools.set(processListTool.definition.name, processListTool);
		this.tools.set(processKillTool.definition.name, processKillTool);

		this.tools.set(revealInFinderTool.definition.name, revealInFinderTool);
		this.tools.set(getFinderSelectionTool.definition.name, getFinderSelectionTool);
		this.tools.set(setFinderTagsTool.definition.name, setFinderTagsTool);
		this.tools.set(quickLookTool.definition.name, quickLookTool);
		this.tools.set(moveToTrashTool.definition.name, moveToTrashTool);
		this.tools.set(spotlightSearchTool.definition.name, spotlightSearchTool);

		this.tools.set(shortcutListTool.definition.name, shortcutListTool);
		this.tools.set(shortcutRunTool.definition.name, shortcutRunTool);
		this.tools.set(waitMsTool.definition.name, waitMsTool);

		this.tools.set(mouseMoveTool.definition.name, mouseMoveTool);
		this.tools.set(mouseClickTool.definition.name, mouseClickTool);
		this.tools.set(mouseDragTool.definition.name, mouseDragTool);
		this.tools.set(mouseScrollTool.definition.name, mouseScrollTool);
		this.tools.set(keyPressTool.definition.name, keyPressTool);
		this.tools.set(typeTextTool.definition.name, typeTextTool);

		this.tools.set(clipboardReadTool.definition.name, clipboardReadTool);
		this.tools.set(clipboardWriteTool.definition.name, clipboardWriteTool);
		this.tools.set(notifyTool.definition.name, notifyTool);
		this.tools.set(promptUserTool.definition.name, promptUserTool);
		this.tools.set(screenshotScreenTool.definition.name, screenshotScreenTool);
		this.tools.set(screenshotWindowTool.definition.name, screenshotWindowTool);

		this.tools.set(mailTool.definition.name, mailTool);
		this.tools.set(calendarTool.definition.name, calendarTool);
		this.tools.set(messagesTool.definition.name, messagesTool);
		this.tools.set(safariTool.definition.name, safariTool);
		this.tools.set(notesTool.definition.name, notesTool);
		this.tools.set(terminalTool.definition.name, terminalTool);

		this.tools.set(iphoneMirrorTool.definition.name, iphoneMirrorTool);
	}

	// Ensure database connection is loaded
	async ensureDbLoaded() {
		if (!this.dbInitialized) {
			await this.vectorDb.connect();
			this.dbInitialized = true;
		}
	}

	// Pre-warm all tool embeddings at server startup
	async warmUpEmbeddings() {
		logger.info('[RAG Warmup] Starting tool embeddings warm-up...');
		await this.ensureDbLoaded();

		const allTools = await this.getOllamaTools();
		logger.info(`[RAG Warmup] Found ${allTools.length} total tools.`);

		const activeProvider = env.EMBEDDING_PROVIDER || (env.OPENAI_API_KEY ? 'openai' : 'ollama');
		const currentModel = activeProvider === 'openai'
			? (env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small')
			: (env.OLLAMA_EMBEDDING_MODEL || 'nomic-embed-text');

		const toolsToEmbed = [];
		const toolsToEmbedTexts = [];

		for (const tool of allTools) {
			const toolName = tool.function?.name || tool.name;
			const isCached = this.vectorDb.isUpToDate(toolName, tool, currentModel);
			if (!isCached) {
				const description = tool.function?.description || tool.description || '';
				toolsToEmbed.push(tool);
				toolsToEmbedTexts.push(`Tool: ${toolName}. Description: ${description}`);
			}
		}

		if (toolsToEmbed.length === 0) {
			logger.info(`[RAG Warmup] All ${allTools.length} tool embeddings are up-to-date. No re-embedding needed.`);
			return;
		}

		logger.info(`[RAG Warmup] Generating embeddings for ${toolsToEmbed.length} tools using model: ${currentModel}...`);
		const embeddings = await this.embedder.embedBatch(toolsToEmbedTexts);

		for (let i = 0; i < toolsToEmbed.length; i++) {
			const tool = toolsToEmbed[i];
			const toolName = tool.function?.name || tool.name;
			this.vectorDb.set(toolName, tool, embeddings[i], currentModel);
		}

		await this.vectorDb.save();
		logger.info(`[RAG Warmup] Successfully pre-warmed ${toolsToEmbed.length} tool embeddings. Total cached: ${allTools.length}.`);
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
		const allTools = await this.getOllamaTools();

		if (!query || typeof query !== 'string' || query.trim() === '') {
			return allTools;
		}

		const activeProvider = env.EMBEDDING_PROVIDER || (env.OPENAI_API_KEY ? 'openai' : 'ollama');
		const currentModel = activeProvider === 'openai'
			? (env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small')
			: (env.OLLAMA_EMBEDDING_MODEL || 'nomic-embed-text');

		try {
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

			if (toolsToEmbed.length > 0) {
				const embeddings = await this.embedder.embedBatch(toolsToEmbedTexts);
				for (let i = 0; i < toolsToEmbed.length; i++) {
					const tool = toolsToEmbed[i];
					const toolName = tool.function?.name || tool.name;
					this.vectorDb.set(toolName, tool, embeddings[i], currentModel);
				}
				await this.vectorDb.save();
			}

			let selectedTools = [];
			const availableToolNames = new Set(allTools.map(t => t.function?.name || t.name));

			let queryEmbedding = null;
			try {
				queryEmbedding = await this.embedder.embed(query);
			} catch (err) {
				// Silent fallback
			}

			if (queryEmbedding) {
				try {
					const results = await this.vectorDb.query(queryEmbedding, env.MAX_RELEVANT_TOOLS);
					if (results && results.ids && results.ids[0]) {
						for (let i = 0; i < results.ids[0].length; i++) {
							const name = results.ids[0][i];
							const metadata = results.metadatas[0][i];
							if (availableToolNames.has(name) && metadata && metadata.tool) {
								const toolObj = JSON.parse(metadata.tool);
								const distance = results.distances[0][i];
								toolObj.score = 1 - distance;
								selectedTools.push(toolObj);
							}
						}
					}
				} catch (err) {
					// log fall backing
					logger.error(`Failed to query Chroma DB natively: ${err.message}. Falling back to manual ranking.`);
				}
			}

			if (selectedTools.length === 0) {
				const cachedToolsList = this.vectorDb.getAll();
				const activeCachedTools = cachedToolsList.filter(item => {
					const name = item.tool.function?.name || item.tool.name;
					return availableToolNames.has(name);
				});

				selectedTools = rankTools(
					query,
					queryEmbedding,
					activeCachedTools,
					env.TOOL_SIMILARITY_THRESHOLD,
					env.MAX_RELEVANT_TOOLS
				);
			}

			const CORE_TOOLS = new Set([
				'read_graph',
				'search_nodes',
				'open_nodes',
				'create_entities',
				'add_observations'
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

			return selectedTools;
		} catch (error) {
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