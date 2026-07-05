import axios from 'axios';
import { registry } from './registry.js';
import { env } from '../config/env.js';
import { catchErrors } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

export class Agent {
	run = catchErrors(async (prompt) => {
		// 1. Prepare message history
		const messages = [
			{
				role: 'system',
				content: `You are a local computer personal assistant. You have access to tools. If you need to call a tool, you MUST use the native tool-calling feature.
For Notion operations: the default parent page ID is "${env.NOTION_PARENT_PAGE_ID || ''}". Use this ID when creating new pages or retrieving notes unless specified otherwise.`
			},
			{ role: 'user', content: prompt }
		];

		// 2. Fetch tool definitions
		const tools = await registry.getOllamaTools();

		// 3. First call to Ollama including the tools list
		const response = await axios.post(`${env.OLLAMA_URL}/api/chat`, {
			model: env.OLLAMA_MODEL,
			messages: messages,
			tools: tools,
			stream: false,
			options: {
				num_ctx: 16384
			}
		});

		let message = response.data.message;

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
			// Add assistant message containing the tool calls to history
			messages.push(message);

			for (const call of message.tool_calls) {
				const toolName = call.function.name;
				const toolArgs = call.function.arguments;

				logger.info(`Agent calling tool: "${toolName}" with arguments: ${JSON.stringify(toolArgs)}`);

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

			// Call Ollama again with the tool results to get the next step
			const nextResponse = await axios.post(`${env.OLLAMA_URL}/api/chat`, {
				model: env.OLLAMA_MODEL,
				messages: messages,
				stream: false,
				options: {
					num_ctx: 16384
				}
			});
			message = nextResponse.data.message;

			// Parse XML tool calls in the subsequent response
			parseXmlToolCalls(message);
		}

		return message.content;
	}, 'Agent reasoning loop failed');
}
