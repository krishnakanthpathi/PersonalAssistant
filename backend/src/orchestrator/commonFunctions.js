import { MongoClient } from 'mongodb';
import OpenAI from 'openai';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { registry } from './registry.js';
import { ToolContext } from './toolContext.js';
import { logger } from '../utils/logger.js';
import { metricsService } from '../utils/metrics.js';
import { env } from '../config/env.js';
import { getDB } from '../config/mongodb.js';
import { getToolCallingCapability, standardizeToolSchema, injectXmlToolsInstructions, prepareMessagesPayload } from './toolCallFilter.js';
import { OKFEngine } from '../rag/okfEngine.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROMPT_FILE_PATH = path.join(__dirname, '../config/system_prompt.md');

// ==========================================
// 1. Prompt Management Helper Functions
// ==========================================

export async function loadSystemPrompt() {
	let systemPromptText;
	try {
		const db = getDB();
		const row = await db.collection('system_prompts').findOne({ isActive: true });
		systemPromptText = row?.prompt;
	} catch (error) {
		logger.error(`Failed to load system prompt from MongoDB: ${error.message}`);
	}

	if (!systemPromptText) {
		try {
			systemPromptText = await fs.promises.readFile(PROMPT_FILE_PATH, 'utf8');
		} catch (error) {
			logger.error(`Failed to read fallback system prompt from file: ${error.message}`);
			systemPromptText = "You are a local computer personal assistant running on macOS. You have access to tools.";
		}
	}
	return systemPromptText;
}

export async function loadOKFContext(query) {
	try {
		if (!OKFEngine.initialized) {
			await OKFEngine.initialize();
		}

		const matchedDocs = OKFEngine.match(query);
		if (!matchedDocs || matchedDocs.length === 0) {
			return { contextBlock: '', okfDocs: [] };
		}

		// Get all currently active tool names to prune inactive ones from context docs
		const activeTools = await registry.getOllamaTools();
		const activeNames = new Set(activeTools.map(t => t.function?.name || t.name));

		let contextBlock = '\n\n## User Long-Term Memory (Open Knowledge Format)\n';
		contextBlock += 'The following structured knowledge files about the user (Krishnakanth), preferences, routines, and environment are loaded:\n\n';

		matchedDocs.forEach(doc => {
			let content = doc.content;

			if (doc.type === 'tool_group') {
				const lines = content.split('\n');
				const filteredLines = lines.filter(line => {
					// Regex to capture tool name from bullets, e.g. "- **`tool_name`**:" or "- `tool_name`:"
					const match = line.match(/(?:-\s+\*\*`?|^\*\s+\*\*`?|-\s+`)([a-zA-Z0-9_\-]+)(?:`?\*\*|`):/);
					if (match) {
						const toolName = match[1];
						return activeNames.has(toolName);
					}
					return true;
				});
				content = filteredLines.join('\n');
			}

			contextBlock += `### Document: ${doc.filename} (Type: ${doc.type})\n`;
			contextBlock += `**Title**: ${doc.title}\n`;
			contextBlock += `**Tags**: ${doc.tags.join(', ')}\n\n`;
			contextBlock += `${content}\n\n`;
			contextBlock += `---\n\n`;
		});

		logger.info(`Injected ${matchedDocs.length} matched OKF documents into system prompt.`);
		return { contextBlock, okfDocs: matchedDocs.map(d => d.filename) };
	} catch (error) {
		logger.error(`Failed to load memory context from OKF catalog: ${error.message}`);
		return { contextBlock: '', okfDocs: [] };
	}
}

export async function prepareMessages(prompt, history, images = []) {
	const cleanedHistory = history
		.map(m => {
			if (m.role === 'assistant') {
				let content = '';
				if (m.speech) {
					content += `<speech>\n${m.speech}\n</speech>\n`;
				}
				if (m.content) {
					content += `<action>\n${m.content}\n</action>`;
				}
				return {
					role: m.role,
					content: content || m.content
				};
			}
			return {
				role: m.role,
				content: m.content
			};
		})
		.filter(m => m.role && m.content);

	let systemPromptText = await loadSystemPrompt();

	// Inject matching memory context directly into the system prompt using OKF Catalog
	const { contextBlock, okfDocs } = await loadOKFContext(prompt);
	if (contextBlock) {
		systemPromptText = `${systemPromptText}${contextBlock}`;
	}

	const messages = [
		{
			role: 'system',
			content: systemPromptText
		},
		...cleanedHistory,
		{ role: 'user', content: prompt, images: images || [] }
	];

	const userMessages = cleanedHistory.filter(m => m.role === 'user').slice(-2);
	const combinedRAGQuery = [...userMessages.map(m => m.content), prompt].join(' ');

	return {
		messages,
		cleanedHistory,
		combinedRAGQuery,
		ragFacts: okfDocs || []
	};
}

// ==========================================
// 2. LLM Provider Integration Client
// ==========================================

export async function callLLM(msgs, includeTools = false, tools = [], requestId = null) {
	// Determine if we should override using the multimedia model config
	const hasImages = msgs.some(m => m.images && m.images.length > 0);
	const useMultimedia = env.USE_MULTIMEDIA_MODEL && hasImages;

	let provider = env.LLM_PROVIDER;
	let model = '';
	let baseUrl = '';
	let apiKey = '';

	if (useMultimedia) {
		provider = env.MULTIMEDIA_PROVIDER || env.LLM_PROVIDER;
		if (provider === 'openai') {
			model = env.MULTIMEDIA_MODEL || env.OPENAI_MODEL;
			baseUrl = env.MULTIMEDIA_BASE_URL || env.OPENAI_BASE_URL || '';
			apiKey = env.MULTIMEDIA_API_KEY || env.OPENAI_API_KEY || '';
		} else if (provider === 'grok') {
			model = env.MULTIMEDIA_MODEL || env.GROK_MODEL || 'grok-2-1218';
			baseUrl = env.MULTIMEDIA_BASE_URL || env.GROK_BASE_URL || 'https://api.x.ai/v1';
			apiKey = env.MULTIMEDIA_API_KEY || env.GROK_API_KEY || '';
		} else if (provider === 'ollama') {
			model = env.MULTIMEDIA_MODEL || env.OLLAMA_MODEL;
			baseUrl = env.MULTIMEDIA_BASE_URL || env.OLLAMA_URL;
		}
		logger.info(`Using dedicated multimedia model: provider=${provider}, model=${model}`);
	} else {
		if (provider === 'openai') {
			model = env.OPENAI_MODEL;
			baseUrl = env.OPENAI_BASE_URL || '';
			apiKey = env.OPENAI_API_KEY || '';
		} else if (provider === 'grok') {
			model = env.GROK_MODEL || 'grok-2-1218';
			baseUrl = env.GROK_BASE_URL || 'https://api.x.ai/v1';
			apiKey = env.GROK_API_KEY || '';
		} else if (provider === 'ollama') {
			model = env.OLLAMA_MODEL;
			baseUrl = env.OLLAMA_URL;
		}
		logger.info(`Using standard chat model: provider=${provider}, model=${model}`);
	}

	let duration = 0;
	let promptEvalDuration = 0;
	let generatedContent = '';

	// Classify tool calling strategy
	const { strategy } = getToolCallingCapability(provider, model, baseUrl);

	// Standardize tools list
	let processedTools = [];
	if (tools && tools.length > 0) {
		processedTools = tools.map(t => standardizeToolSchema(t));
	}

	let useNativeTools = false;
	let finalMsgs = msgs;

	if (includeTools && processedTools.length > 0) {
		if (strategy === 'native') {
			useNativeTools = true;
		} else if (strategy === 'xml') {
			logger.info(`Using XML fallback for tool calling with model: ${model}`);
			finalMsgs = injectXmlToolsInstructions(msgs, processedTools);
		} else {
			logger.info(`Tool calling is disabled (strategy: none) for model: ${model}`);
		}
	}

	// Prepare and clean messages history for the API payload
	finalMsgs = prepareMessagesPayload(finalMsgs, strategy);

	// Format images for OpenAI-like APIs (OpenAI & Grok) or Ollama
	if (provider === 'openai' || provider === 'grok') {
		for (const msg of finalMsgs) {
			if (msg.images && msg.images.length > 0) {
				const contentParts = [
					{ type: 'text', text: msg.content }
				];
				for (const img of msg.images) {
					contentParts.push({
						type: 'image_url',
						image_url: {
							url: `data:${img.mimeType};base64,${img.data}`
						}
					});
				}
				msg.content = contentParts;
				delete msg.images;
			}
		}
	} else if (provider === 'ollama') {
		for (const msg of finalMsgs) {
			if (msg.images && msg.images.length > 0) {
				msg.images = msg.images.map(img => img.data);
			} else {
				delete msg.images;
			}
		}
	}

	if (provider === 'openai') {
		const targetKey = apiKey || env.OPENAI_API_KEY;
		if (!targetKey) {
			throw new Error('OPENAI_API_KEY is not defined.');
		}
		const openaiInstance = new OpenAI({
			apiKey: targetKey,
			baseURL: baseUrl || undefined
		});

		const payload = {
			model: model,
			messages: finalMsgs,
			stream: false
		};

		if (useNativeTools) {
			payload.tools = processedTools;
		}

		const payloadSize = JSON.stringify(payload).length;
		logger.info(`OpenAI request: model=${model}, messages=${finalMsgs.length}, payloadSize=${payloadSize} chars`);

		try {
			const start = Date.now();
			const res = await openaiInstance.chat.completions.create(payload);
			duration = Date.now() - start;

			const responseMessage = res.choices[0].message;
			logger.info(`OpenAI response: role=${responseMessage.role}, tool_calls=${responseMessage.tool_calls?.length || 0}`);

			generatedContent = responseMessage.content || '';
			if (responseMessage.tool_calls) {
				generatedContent += '\nTool Calls: ' + JSON.stringify(responseMessage.tool_calls.map(tc => tc.function.name));
			}
			if (requestId) {
				metricsService.recordLLMCall(requestId, duration, promptEvalDuration, generatedContent);
			}

			return {
				message: {
					role: 'assistant',
					content: responseMessage.content || '',
					tool_calls: responseMessage.tool_calls ? responseMessage.tool_calls.map(tc => ({
						id: tc.id,
						type: tc.type,
						function: {
							name: tc.function.name,
							arguments: tc.function.arguments
						}
					})) : undefined
				}
			};
		} catch (error) {
			logger.error(`OpenAI request failed: ${error.message}`);
			throw error;
		}
	} else if (provider === 'grok') {
		const targetKey = apiKey || env.GROK_API_KEY;
		if (!targetKey) {
			throw new Error('GROK_API_KEY is not defined.');
		}
		const grokInstance = new OpenAI({
			apiKey: targetKey,
			baseURL: baseUrl || 'https://api.x.ai/v1'
		});

		const payload = {
			model: model,
			messages: finalMsgs,
			stream: false
		};

		if (useNativeTools) {
			payload.tools = processedTools;
		}

		const payloadSize = JSON.stringify(payload).length;
		logger.info(`Grok request: model=${model}, messages=${finalMsgs.length}, payloadSize=${payloadSize} chars`);

		try {
			const start = Date.now();
			const res = await grokInstance.chat.completions.create(payload);
			duration = Date.now() - start;

			const responseMessage = res.choices[0].message;
			logger.info(`Grok response: role=${responseMessage.role}, tool_calls=${responseMessage.tool_calls?.length || 0}`);

			generatedContent = responseMessage.content || '';
			if (responseMessage.tool_calls) {
				generatedContent += '\nTool Calls: ' + JSON.stringify(responseMessage.tool_calls.map(tc => tc.function.name));
			}
			if (requestId) {
				metricsService.recordLLMCall(requestId, duration, promptEvalDuration, generatedContent);
			}

			return {
				message: {
					role: 'assistant',
					content: responseMessage.content || '',
					tool_calls: responseMessage.tool_calls ? responseMessage.tool_calls.map(tc => ({
						id: tc.id,
						type: tc.type,
						function: {
							name: tc.function.name,
							arguments: tc.function.arguments
						}
					})) : undefined
				}
			};
		} catch (error) {
			logger.error(`Grok request failed: ${error.message}`);
			throw error;
		}
	} else {
		const payload = {
			model: model,
			messages: finalMsgs,
			stream: false,
			options: {
				num_ctx: 32768
			}
		};
		if (useNativeTools) {
			payload.tools = processedTools;
		}

		const payloadSize = JSON.stringify(payload).length;
		logger.info(`Ollama request: model=${model}, messages=${finalMsgs.length}, payloadSize=${payloadSize} chars`);

		try {
			const start = Date.now();
			const res = await axios.post(`${baseUrl}/api/chat`, payload);
			const elapsed = Date.now() - start;
			const data = res.data;

			promptEvalDuration = data.prompt_eval_duration ? Math.round(data.prompt_eval_duration / 1000000) : 0;
			duration = data.eval_duration ? Math.round(data.eval_duration / 1000000) : elapsed - promptEvalDuration;
			if (duration < 0) duration = elapsed;

			generatedContent = data.message?.content || '';
			if (data.message?.tool_calls) {
				generatedContent += '\nTool Calls: ' + JSON.stringify(data.message.tool_calls.map(tc => tc.function.name));
			}
			if (requestId) {
				metricsService.recordLLMCall(requestId, duration, promptEvalDuration, generatedContent);
			}

			logger.info(`Ollama response: status=${res.status}, done=${data.done}, tool_calls=${data.message?.tool_calls?.length || 0}`);
			return data;
		} catch (error) {
			if (error.response) {
				logger.error(`Ollama HTTP error: status=${error.response.status}, response body: ${JSON.stringify(error.response.data).substring(0, 500)}`);
			} else {
				logger.error(`Ollama request failed: ${error.message}`);
			}
			throw error;
		}
	}
}

// ==========================================
// 3. XML Tool Call Parser
// ==========================================

export function parseXmlToolCalls(msg, activeTools = []) {
	if ((!msg.tool_calls || msg.tool_calls.length === 0) && msg.content) {
		const toolCalls = [];
		const activeToolNames = new Set(activeTools.map(t => t.function?.name || t.name));

		// 1. Try extracting <tool_call> / <toolcall> blocks
		const toolCallRegex = /<tool_?call>([\s\S]*?)<\/tool_?call>/gi;
		let match;
		let foundTags = false;

		while ((match = toolCallRegex.exec(msg.content)) !== null) {
			foundTags = true;
			const block = match[1].trim();
			const parsed = parseSingleToolCallBlock(block, activeToolNames);
			if (parsed) {
				toolCalls.push(parsed);
			}
		}

		// 2. Try raw <invoke> blocks if no <tool_call> tags found
		if (!foundTags) {
			const invokeRegex = /<invoke\s+name=["']([^"']+)["'][^>]*>([\s\S]*?)<\/invoke>/gi;
			while ((match = invokeRegex.exec(msg.content)) !== null) {
				foundTags = true;
				const toolName = match[1];
				const innerContent = match[2];

				// Only parse if it is a valid active tool
				if (activeToolNames.size === 0 || activeToolNames.has(toolName) || registry.tools.has(toolName)) {
					const args = {};
					const paramRegex = /<parameter\s+name=["']([^"']+)["'][^>]*>([\s\S]*?)<\/parameter>/gi;
					let pMatch;
					while ((pMatch = paramRegex.exec(innerContent)) !== null) {
						const pName = pMatch[1];
						const pVal = pMatch[2].trim();
						args[pName] = parseParamValue(pVal);
					}

					toolCalls.push({
						id: 'xml_' + Math.random().toString(36).substr(2, 9),
						type: 'function',
						isXml: true,
						function: {
							name: toolName,
							arguments: args
						}
					});
				}
			}
		}

		// 3. Try <name>...</name><arguments>...</arguments> format (DeepSeek style)
		if (toolCalls.length === 0) {
			const nameArgRegex = /<name>\s*([\s\S]*?)\s*<\/name>\s*<arguments>\s*([\s\S]*?)\s*<\/arguments>/gi;
			while ((match = nameArgRegex.exec(msg.content)) !== null) {
				const toolName = match[1].trim();
				const argsText = match[2].trim();
				if (toolName && (activeToolNames.size === 0 || activeToolNames.has(toolName) || registry.tools.has(toolName))) {
					let parsedArgs = {};
					try {
						parsedArgs = JSON.parse(argsText);
					} catch (e) {
						logger.warn(`Failed to parse arguments JSON in <name>/<arguments> block for tool "${toolName}": ${e.message}`);
					}
					toolCalls.push({
						id: 'xml_' + Math.random().toString(36).substr(2, 9),
						type: 'function',
						isXml: true,
						function: {
							name: toolName,
							arguments: parsedArgs
						}
					});
				}
			}
		}

		// 4. Try markdown JSON code blocks (```json ... ```)
		if (toolCalls.length === 0) {
			const mdJsonRegex = /```json\s*([\s\S]*?)\s*```/gi;
			while ((match = mdJsonRegex.exec(msg.content)) !== null) {
				const parsed = tryParseJsonBlock(match[1], activeToolNames);
				if (parsed) {
					toolCalls.push(parsed);
				}
			}
		}

		// 5. Try parsing the entire trimmed content as JSON (strip <thinking> first)
		if (toolCalls.length === 0) {
			const strippedContent = stripThinkingTags(msg.content);
			const parsed = tryParseJsonBlock(strippedContent, activeToolNames);
			if (parsed) {
				toolCalls.push(parsed);
			}
		}

		// 6. Try finding raw JSON blocks inside the text by scanning braces
		if (toolCalls.length === 0) {
			const blocks = findJsonBlocks(msg.content);
			for (const block of blocks) {
				const parsed = tryParseJsonBlock(block, activeToolNames);
				if (parsed) {
					toolCalls.push(parsed);
				}
			}
		}

		if (toolCalls.length > 0) {
			msg.tool_calls = toolCalls;
		}
	}
}

function parseSingleToolCallBlock(block, activeToolNames) {
	// Strip <thinking> tags that some models prepend before the JSON tool call
	const cleanedBlock = stripThinkingTags(block);

	// Try parsing as JSON first (using cleaned block without <thinking> tags)
	try {
		const toolJson = JSON.parse(cleanedBlock);
		const toolName = toolJson.name;
		if (toolName && (activeToolNames.size === 0 || activeToolNames.has(toolName) || registry.tools.has(toolName))) {
			return {
				id: 'xml_' + Math.random().toString(36).substr(2, 9),
				type: 'function',
				isXml: true,
				function: {
					name: toolName,
					arguments: toolJson.arguments || {}
				}
			};
		}
	} catch (e) {
		// Not JSON — try <name>/<arguments> tag format
		const nameArgMatch = cleanedBlock.match(/<name>\s*([\s\S]*?)\s*<\/name>\s*<arguments>\s*([\s\S]*?)\s*<\/arguments>/i);
		if (nameArgMatch) {
			const toolName = nameArgMatch[1].trim();
			if (toolName && (activeToolNames.size === 0 || activeToolNames.has(toolName) || registry.tools.has(toolName))) {
				let parsedArgs = {};
				try {
					parsedArgs = JSON.parse(nameArgMatch[2].trim());
				} catch (jsonErr) {
					logger.warn(`Failed to parse arguments in <name>/<arguments> block for "${toolName}": ${jsonErr.message}`);
				}
				return {
					id: 'xml_' + Math.random().toString(36).substr(2, 9),
					type: 'function',
					isXml: true,
					function: {
						name: toolName,
						arguments: parsedArgs
					}
				};
			}
		}

		// Try parsing as XML/HTML tags (<invoke> format)
		const invokeRegex = /<invoke\s+name=["']([^"']+)["']/i;
		const nameMatch = cleanedBlock.match(invokeRegex);
		if (nameMatch) {
			const toolName = nameMatch[1];
			if (activeToolNames.size === 0 || activeToolNames.has(toolName) || registry.tools.has(toolName)) {
				const args = {};

				const paramRegex = /<parameter\s+name=["']([^"']+)["'][^>]*>([\s\S]*?)<\/parameter>/gi;
				let pMatch;
				while ((pMatch = paramRegex.exec(cleanedBlock)) !== null) {
					const pName = pMatch[1];
					const pVal = pMatch[2].trim();
					args[pName] = parseParamValue(pVal);
				}

				return {
					id: 'xml_' + Math.random().toString(36).substr(2, 9),
					type: 'function',
					isXml: true,
					function: {
						name: toolName,
						arguments: args
					}
				};
			}
		}

		// Try parsing as tag-based XML keys/values (<arg_key>/<arg_value> format)
		const tagBased = parseTagBasedToolCall(cleanedBlock, activeToolNames);
		if (tagBased) {
			return tagBased;
		}

		// Last resort: try finding JSON blocks within the cleaned block
		const jsonBlocks = findJsonBlocks(cleanedBlock);
		for (const jsonBlock of jsonBlocks) {
			try {
				const parsed = JSON.parse(jsonBlock);
				if (parsed && parsed.name && (activeToolNames.size === 0 || activeToolNames.has(parsed.name) || registry.tools.has(parsed.name))) {
					return {
						id: 'xml_' + Math.random().toString(36).substr(2, 9),
						type: 'function',
						isXml: true,
						function: {
							name: parsed.name,
							arguments: parsed.arguments || {}
						}
					};
				}
			} catch (innerErr) {
				// continue
			}
		}

		logger.error(`Failed to parse XML tool call block: ${block.substring(0, 200)}`, e);
	}
	return null;
}

function parseTagBasedToolCall(block, activeToolNames) {
	const firstArgKeyIdx = block.indexOf('<arg_key>');
	if (firstArgKeyIdx === -1) {
		return null;
	}

	const toolName = block.substring(0, firstArgKeyIdx).trim();
	if (!toolName || (activeToolNames.size > 0 && !activeToolNames.has(toolName) && !registry.tools.has(toolName))) {
		return null;
	}

	const args = {};
	const keyRegex = /<arg_key>([\s\S]*?)<\/arg_key>\s*<arg_value>([\s\S]*?)<\/arg_value>/gi;
	let match;
	while ((match = keyRegex.exec(block)) !== null) {
		const key = match[1].trim();
		const val = match[2].trim();
		args[key] = parseParamValue(val);
	}

	return {
		id: 'xml_' + Math.random().toString(36).substr(2, 9),
		type: 'function',
		isXml: true,
		function: {
			name: toolName,
			arguments: args
		}
	};
}

function parseParamValue(val) {
	if (val === 'true') return true;
	if (val === 'false') return false;
	if (!isNaN(val) && val.trim() !== '') {
		return val.includes('.') ? parseFloat(val) : parseInt(val, 10);
	}
	if (val.startsWith('{') || val.startsWith('[')) {
		try {
			return JSON.parse(val);
		} catch (e) {
			// ignore and return string
		}
	}
	return val;
}

function tryParseJsonBlock(text, activeToolNames) {
	try {
		const parsed = JSON.parse(text.trim());
		if (parsed && typeof parsed === 'object' && parsed.name) {
			const toolName = parsed.name;
			if (activeToolNames.size === 0 || activeToolNames.has(toolName) || registry.tools.has(toolName)) {
				return {
					id: 'xml_' + Math.random().toString(36).substr(2, 9),
					type: 'function',
					isXml: true,
					function: {
						name: toolName,
						arguments: parsed.arguments || {}
					}
				};
			}
		}
	} catch (e) {
		// Ignore
	}
	return null;
}

/**
 * Strips <thinking>...</thinking> tags (and similar reasoning wrappers) from text.
 * Models like DeepSeek often prepend these before tool call JSON.
 */
function stripThinkingTags(text) {
	return text
		.replace(/<thinking>[\s\S]*?<\/thinking>/gi, '')
		.replace(/<think>[\s\S]*?<\/think>/gi, '')
		.trim();
}

function findJsonBlocks(text) {
	const blocks = [];
	let braceCount = 0;
	let startIdx = -1;

	for (let i = 0; i < text.length; i++) {
		if (text[i] === '{') {
			if (braceCount === 0) {
				startIdx = i;
			}
			braceCount++;
		} else if (text[i] === '}') {
			if (braceCount > 0) {
				braceCount--;
				if (braceCount === 0 && startIdx !== -1) {
					blocks.push(text.substring(startIdx, i + 1));
				}
			}
		}
	}
	return blocks;
}

// ==========================================
// 4. Tool Execution & Logging Helpers
// ==========================================

export function parseToolArguments(rawArgs) {
	if (typeof rawArgs === 'string') {
		try {
			return JSON.parse(rawArgs);
		} catch (e) {
			logger.error(`Failed to parse tool arguments: ${rawArgs}`, e);
			return {};
		}
	}
	return rawArgs || {};
}

export function createToolContext(toolName, onStatusUpdate) {
	return new ToolContext((progressInfo) => {
		if (onStatusUpdate) {
			let msg = `Running: ${toolName}`;
			if (typeof progressInfo === 'string') {
				msg += ` - ${progressInfo}`;
			} else if (progressInfo && typeof progressInfo === 'object' && progressInfo.message) {
				msg += ` - ${progressInfo.message}`;
			}
			onStatusUpdate(msg);
		}
	});
}

export async function executeToolWithLogging(toolName, toolArgs, toolContext, requestId, toolCallStart, onStatusUpdate = null) {
	logger.info(`Agent calling tool: "${toolName}" with arguments: ${JSON.stringify(toolArgs)}`);
	if (onStatusUpdate) {
		onStatusUpdate(`Calling tool: ${toolName} (Args: ${JSON.stringify(toolArgs)})`);
	}

	const requestStartVal = metricsService.activeRequests.get(requestId)?.startTime || Date.now();
	const latencyFromRequestStart = toolCallStart - requestStartVal;

	try {
		let toolResult = await registry.callTool(toolName, toolArgs, toolContext);
		const toolLatency = Date.now() - toolCallStart;

		const resultString = typeof toolResult === 'string' ? toolResult : JSON.stringify(toolResult);
		const MAX_RESULT_LENGTH = env.MAX_TOOL_RESULT_LENGTH || 35000;
		let finalResult = resultString;
		if (resultString.length > MAX_RESULT_LENGTH) {
			logger.warn(`Tool "${toolName}" result length (${resultString.length}) exceeds safety limit of ${MAX_RESULT_LENGTH}. Truncating.`);
			finalResult = resultString.substring(0, MAX_RESULT_LENGTH) +
				`\n\n[WARNING: Tool result truncated! Total length was ${resultString.length} characters. The remaining output has been omitted to prevent exceeding model context limits. If you need more specific details, please refine your search query or run a more targeted tool.]`;
		}

		logger.info(`Tool "${toolName}" executed successfully. Result length: ${finalResult.length} characters.`);
		if (onStatusUpdate) {
			onStatusUpdate(`Tool ${toolName} succeeded (${toolLatency}ms)`);
		}

		metricsService.recordToolCall(requestId, {
			name: toolName,
			args: toolArgs,
			latency: toolLatency,
			latencyFromRequestStart,
			success: true,
			result: finalResult
		});

		return { success: true, result: finalResult };
	} catch (error) {
		const toolLatency = Date.now() - toolCallStart;
		logger.error(`Tool "${toolName}" failed to execute: ${error.message}`);
		if (onStatusUpdate) {
			onStatusUpdate(`Tool ${toolName} failed: ${error.message} (${toolLatency}ms)`);
		}

		metricsService.recordToolCall(requestId, {
			name: toolName,
			args: toolArgs,
			latency: toolLatency,
			latencyFromRequestStart,
			success: false,
			error: error.message
		});

		return { success: false, error: error.message };
	}
}

export function appendToolSuccessMessage(messages, call, result, toolName) {
	if (call.isXml) {
		messages.push({
			role: 'user',
			content: `<tool_response>\n${String(result)}\n</tool_response>`
		});
	} else {
		const toolMessage = {
			role: 'tool',
			content: String(result),
			name: toolName
		};
		if (call.id) {
			toolMessage.tool_call_id = call.id;
		}
		messages.push(toolMessage);
	}
}

export function appendToolErrorMessage(messages, call, errorMsg, toolName) {
	if (call.isXml) {
		messages.push({
			role: 'user',
			content: `<tool_response>\nError: ${errorMsg}\n</tool_response>`
		});
	} else {
		const toolMessage = {
			role: 'tool',
			content: `Error: ${errorMsg}`,
			name: toolName
		};
		if (call.id) {
			toolMessage.tool_call_id = call.id;
		}
		messages.push(toolMessage);
	}
}

// ==========================================
// 5. Response Parsing Helpers
// ==========================================

export function parseAgentResponse(rawContent) {
	// Strip thinking/reasoning tags first so they don't pollute final output or text-to-speech
	const cleaned = stripThinkingTags(rawContent);

	const speechMatch = cleaned.match(/<speech>([\s\S]*?)<\/speech>/i);
	const actionMatch = cleaned.match(/<action>([\s\S]*?)<\/action>/i);

	let speech = '';
	let action = '';

	if (speechMatch) {
		speech = speechMatch[1].trim();
	}
	if (actionMatch) {
		action = actionMatch[1].trim();
	}

	if (!speechMatch && !actionMatch) {
		action = cleaned.trim();
		speech = cleanTextForSpeech(action);
	} else if (speechMatch && !actionMatch) {
		action = cleaned.replace(/<speech>[\s\S]*?<\/speech>/gi, '').trim();
	} else if (!speechMatch && actionMatch) {
		action = actionMatch[1].trim();
		speech = cleanTextForSpeech(action);
	}

	// Clean remaining assistant-specific tags
	const tagRegex = /<\/?(speech|action|thought)>/gi;
	speech = speech.replace(tagRegex, '').trim();
	action = action.replace(tagRegex, '').trim();

	return { speech, content: action };
}

export function cleanTextForSpeech(text) {
	let clean = text
		.replace(/<[^>]*>/g, '')
		.replace(/```[\s\S]*?```/g, '')
		.replace(/`([^`]+)`/g, '$1')
		.replace(/[#*_\-]/g, '')
		.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
		.split('\n')
		.map(line => line.trim())
		.filter(line => line.length > 0)
		.join('. ');

	const sentences = clean.split(/[.!?]+/);
	return sentences.slice(0, 2).join('. ').trim();
}
