import axios from 'axios';
import OpenAI from 'openai';
import { registry } from './registry.js';
import { env } from '../config/env.js';
import { catchErrors } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

export class Agent {
	run = catchErrors(async (prompt, historyOrStatusUpdate, maybeStatusUpdate) => {
		let history = [];
		let onStatusUpdate = null;

		if (typeof historyOrStatusUpdate === 'function') {
			onStatusUpdate = historyOrStatusUpdate;
		} else {
			history = historyOrStatusUpdate || [];
			onStatusUpdate = maybeStatusUpdate;
		}

		// Sanitize and map standard message fields from history
		const cleanedHistory = history
			.map(m => ({
				role: m.role,
				content: m.content
			}))
			.filter(m => m.role && m.content);

		// 1. Prepare message history
		const messages = [
			{
				role: 'system',
				content: `
You are a local computer personal assistant. You have access to tools. If you need to call a tool, you MUST use the native tool-calling feature.
For File System operations:
- You can view, create, edit, search, or list files and directories in the local workspace directory.
For Notion operations:
- The default parent page ID is "${env.NOTION_PARENT_PAGE_ID || ''}". Use this ID when creating new pages or retrieving notes unless specified otherwise.
For Google Calendar operations:
- You can read, create, update, delete, and list events on Google Calendar.`
			},
			...cleanedHistory,
			{ role: 'user', content: prompt }
		];

		// Generate a search query for tool selection that combines previous user inputs
		// to maintain context (e.g. if the user says "set it to 50" after "set volume to 80")
		const userMessages = cleanedHistory.filter(m => m.role === 'user').slice(-2);
		const combinedRAGQuery = [...userMessages.map(m => m.content), prompt].join(' ');

		// 2. Fetch tool definitions using RAG selection
		const tools = await registry.getRelevantTools(combinedRAGQuery);
		logger.info(`Loaded ${tools.length} tools for agent`);



		const MAX_ITERATIONS = 15;
		let iteration = 0;

		// Helper to call LLM (Ollama or OpenAI) with detailed logging
		const callLLM = async (msgs, includeTools = false) => {
			const provider = env.LLM_PROVIDER;
			logger.info(`Calling LLM via provider: ${provider}`);

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
					const res = await openaiInstance.chat.completions.create(payload);
					const responseMessage = res.choices[0].message;
					logger.info(`OpenAI response: role=${responseMessage.role}, tool_calls=${responseMessage.tool_calls?.length || 0}`);
					logger.debug(`OpenAI response content (first 500 chars): ${(responseMessage.content || '').substring(0, 500)}`);
					
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
			} else {
				const payload = {
					model: env.OLLAMA_MODEL,
					messages: msgs,
					stream: false,
					options: {
						num_ctx: 16384
					}
				};
				if (includeTools && tools.length > 0) {
					payload.tools = tools;
				}

				const payloadSize = JSON.stringify(payload).length;
				logger.info(`Ollama request: model=${env.OLLAMA_MODEL}, messages=${msgs.length}, payloadSize=${payloadSize} chars`);
				logger.debug(`Ollama message roles: [${msgs.map(m => m.role).join(', ')}]`);

				try {
					const res = await axios.post(`${env.OLLAMA_URL}/api/chat`, payload);
					const data = res.data;
					logger.info(`Ollama response: status=${res.status}, done=${data.done}, done_reason=${data.done_reason || 'N/A'}, eval_count=${data.eval_count || 'N/A'}, tool_calls=${data.message?.tool_calls?.length || 0}`);
					logger.debug(`Ollama response content (first 500 chars): ${(data.message?.content || '').substring(0, 500)}`);
					return data;
				} catch (error) {
					if (error.response) {
						logger.error(`Ollama HTTP error: status=${error.response.status}, statusText=${error.response.statusText}`);
						logger.error(`Ollama error response body: ${JSON.stringify(error.response.data).substring(0, 1000)}`);
					} else {
						logger.error(`Ollama request failed: ${error.message}`);
					}
					throw error;
				}
			}
		};

		// 3. First call to LLM including the tools list
		if (onStatusUpdate) {
			onStatusUpdate('Thinking...');
		}
		const response = await callLLM(messages, true);

		let message = response.message;

		// Helper to extract XML tool calls if native tool_calls is empty
		const parseXmlToolCalls = (msg) => {
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
		};

		// Parse XML tool calls in the initial response
		parseXmlToolCalls(message);

		// Keep executing tool calls as long as the model requests them (Reasoning Loop)
		while (message.tool_calls && message.tool_calls.length > 0) {
			iteration++;
			logger.info(`--- Reasoning loop iteration ${iteration} (${message.tool_calls.length} tool call(s)) ---`);

			if (iteration > MAX_ITERATIONS) {
				logger.warn(`Reasoning loop exceeded max iterations (${MAX_ITERATIONS}). Breaking out.`);
				message.content = message.content || `I completed ${iteration - 1} steps but stopped to avoid an infinite loop. Here's what I accomplished so far.`;
				break;
			}

			// Add assistant message containing the tool calls to history
			messages.push(message);

			for (const call of message.tool_calls) {
				const toolName = call.function.name;
				let toolArgs = call.function.arguments;

				if (typeof toolArgs === 'string') {
					try {
						toolArgs = JSON.parse(toolArgs);
					} catch (e) {
						logger.error(`Failed to parse tool arguments: ${toolArgs}`, e);
					}
				}

				logger.info(`Agent calling tool: "${toolName}" with arguments: ${JSON.stringify(toolArgs)}`);
				if (onStatusUpdate) {
					onStatusUpdate(`Running: ${toolName}`);
				}

				try {
					// Execute the tool (local or MCP)
					const toolResult = await registry.callTool(toolName, toolArgs);
					logger.info(`Tool "${toolName}" executed successfully. Result length: ${String(toolResult).length} characters.`);

					if (call.isXml) {
						// For XML-based tool calls, append as a user message with tool_response tags
						messages.push({
							role: 'user',
							content: `<tool_response>\n${String(toolResult)}\n</tool_response>`
						});
					} else {
						// For native tool calls, append as a tool message with tool_call_id
						const toolMessage = {
							role: 'tool',
							content: String(toolResult),
							name: toolName
						};
						if (call.id) {
							toolMessage.tool_call_id = call.id;
						}
						messages.push(toolMessage);
					}
				} catch (error) {
					logger.error(`Tool "${toolName}" failed to execute: ${error.message}`);
					if (call.isXml) {
						messages.push({
							role: 'user',
							content: `<tool_response>\nError: ${error.message}\n</tool_response>`
						});
					} else {
						const toolMessage = {
							role: 'tool',
							content: `Error: ${error.message}`,
							name: toolName
						};
						if (call.id) {
							toolMessage.tool_call_id = call.id;
						}
						messages.push(toolMessage);
					}
				}
			}

			// Call LLM again with the tool results to get the next step
			if (onStatusUpdate) {
				onStatusUpdate(`Thinking... (step ${iteration})`);
			}
			const nextResponse = await callLLM(messages, false);
			message = nextResponse.message;

			// Parse XML tool calls in the subsequent response
			parseXmlToolCalls(message);
		}

		logger.info(`Agent finished after ${iteration} tool-calling iteration(s).`);
		return message.content;
	}, 'Agent reasoning loop failed');
}
