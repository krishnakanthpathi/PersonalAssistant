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

export async function prepareMessages(prompt, history) {
	const cleanedHistory = history
		.map(m => ({
			role: m.role,
			content: m.content
		}))
		.filter(m => m.role && m.content);

	const systemPromptText = await loadSystemPrompt();

	const messages = [
		{
			role: 'system',
			content: systemPromptText
		},
		...cleanedHistory,
		{ role: 'user', content: prompt }
	];

	const userMessages = cleanedHistory.filter(m => m.role === 'user').slice(-2);
	const combinedRAGQuery = [...userMessages.map(m => m.content), prompt].join(' ');

	return {
		messages,
		cleanedHistory,
		combinedRAGQuery
	};
}

// ==========================================
// 2. LLM Provider Integration Client
// ==========================================

export async function callLLM(msgs, includeTools = false, tools = [], requestId = null) {
	const provider = env.LLM_PROVIDER;
	logger.info(`Calling LLM via provider: ${provider}`);
	let duration = 0;
	let promptEvalDuration = 0;
	let generatedContent = '';

	if (provider === 'openai') {
		if (!env.OPENAI_API_KEY) {
			throw new Error('OPENAI_API_KEY is not defined in the environment variables.');
		}
		const openaiInstance = new OpenAI({
			apiKey: env.OPENAI_API_KEY,
			baseURL: env.OPENAI_BASE_URL || undefined
		});

		const payload = {
			model: env.OPENAI_MODEL,
			messages: msgs,
			stream: false
		};

		if (includeTools && tools.length > 0) {
			payload.tools = tools;
		}

		const payloadSize = JSON.stringify(payload).length;
		logger.info(`OpenAI request: model=${env.OPENAI_MODEL}, messages=${msgs.length}, payloadSize=${payloadSize} chars`);

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
		if (!env.GROK_API_KEY) {
			throw new Error('GROK_API_KEY is not defined in the environment variables.');
		}
		const grokInstance = new OpenAI({
			apiKey: env.GROK_API_KEY,
			baseURL: env.GROK_BASE_URL || 'https://api.x.ai/v1'
		});

		const payload = {
			model: env.GROK_MODEL || 'grok-2-1218',
			messages: msgs,
			stream: false
		};

		if (includeTools && tools.length > 0) {
			payload.tools = tools;
		}

		const payloadSize = JSON.stringify(payload).length;
		logger.info(`Grok request: model=${payload.model}, messages=${msgs.length}, payloadSize=${payloadSize} chars`);

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
			model: env.OLLAMA_MODEL,
			messages: msgs,
			stream: false,
			options: {
				num_ctx: 32768
			}
		};
		if (includeTools && tools.length > 0) {
			payload.tools = tools;
		}

		const payloadSize = JSON.stringify(payload).length;
		logger.info(`Ollama request: model=${env.OLLAMA_MODEL}, messages=${msgs.length}, payloadSize=${payloadSize} chars`);

		try {
			const start = Date.now();
			const res = await axios.post(`${env.OLLAMA_URL}/api/chat`, payload);
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

export function parseXmlToolCalls(msg) {
	if ((!msg.tool_calls || msg.tool_calls.length === 0) && msg.content && msg.content.includes('<tool_call>')) {
		msg.tool_calls = [];
		const regex = /<tool_call>([\s\S]*?)<\/tool_call>/g;
		let match;
		while ((match = regex.exec(msg.content)) !== null) {
			try {
				const toolJson = JSON.parse(match[1].trim());
				msg.tool_calls.push({
					isXml: true,
					function: {
						name: toolJson.name,
						arguments: toolJson.arguments
					}
				});
			} catch (e) {
				logger.error(`Failed to parse XML tool call: ${match[1]}`, e);
			}
		}
	}
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
		const toolResult = await registry.callTool(toolName, toolArgs, toolContext);
		const toolLatency = Date.now() - toolCallStart;
		logger.info(`Tool "${toolName}" executed successfully. Result length: ${String(toolResult).length} characters.`);
		if (onStatusUpdate) {
			onStatusUpdate(`Tool ${toolName} succeeded (${toolLatency}ms)`);
		}

		metricsService.recordToolCall(requestId, {
			name: toolName,
			args: toolArgs,
			latency: toolLatency,
			latencyFromRequestStart,
			success: true,
			result: toolResult
		});

		return { success: true, result: toolResult };
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
	const speechMatch = rawContent.match(/<speech>([\s\S]*?)<\/speech>/i);
	const actionMatch = rawContent.match(/<action>([\s\S]*?)<\/action>/i);

	let speech = '';
	let action = '';

	if (speechMatch) {
		speech = speechMatch[1].trim();
	}
	if (actionMatch) {
		action = actionMatch[1].trim();
	}

	if (!speechMatch && !actionMatch) {
		action = rawContent.trim();
		speech = cleanTextForSpeech(action);
	} else if (speechMatch && !actionMatch) {
		action = rawContent.replace(/<speech>[\s\S]*?<\/speech>/gi, '').trim();
	} else if (!speechMatch && actionMatch) {
		action = actionMatch[1].trim();
		speech = cleanTextForSpeech(action);
	}

	return { speech, content: action };
}

export function cleanTextForSpeech(text) {
	let clean = text
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
