import axios from 'axios';
import { registry } from './registry.js';
import { env } from '../config/env.js';
import { catchErrors } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

export class Agent {
	run = catchErrors(async (prompt, onStatusUpdate) => {
		// 1. Prepare message history
		const messages = [
			{
				role: 'system',
				content: `
You are a local computer personal assistant. You have access to tools. If you need to call a tool, you MUST use the native tool-calling feature.
For Notion operations:
- The default parent page ID is "${env.NOTION_PARENT_PAGE_ID || ''}". Use this ID when creating new pages or retrieving notes unless specified otherwise.
For Browser/Puppeteer operations: 
- You can control a local headless browser to search, browse, click, and autofill forms. 
- Use these browser tools to interact with web pages and auto-populate form fields using details retrieved from Notion or local workspace data.

Browser/Puppeteer Tool Usage Guidelines:
- Use the 'puppeteer_navigate' tool to navigate to a URL.
- Use the 'puppeteer_fill' tool to auto-populate form input fields with data.
- Use the 'puppeteer_click' tool to interact with buttons, links, or other clickable elements.
- Use the 'puppeteer_screenshot' tool to capture the current state of the browser page.
- Use the 'puppeteer_select' tool to choose options from dropdown selectors.
- Use the 'puppeteer_evaluate' tool to run custom JavaScript inside the browser context when necessary.
- Ensure you perform appropriate actions to interact with dynamic web elements, such as waiting for page loads or specific element visibility.`
			},
			{ role: 'user', content: prompt }
		];

		// 2. Fetch tool definitions
		const tools = await registry.getOllamaTools();
		logger.info(`Loaded ${tools.length} tools for agent`);

		const MAX_ITERATIONS = 15;
		let iteration = 0;

		// Helper to call Ollama with detailed logging
		const callOllama = async (msgs, includeTools = false) => {
			const payload = {
				model: env.OLLAMA_MODEL,
				messages: msgs,
				stream: false,
				options: {
					num_ctx: 16384
				}
			};
			if (includeTools) {
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
				// Log detailed axios error info
				if (error.response) {
					logger.error(`Ollama HTTP error: status=${error.response.status}, statusText=${error.response.statusText}`);
					logger.error(`Ollama error response body: ${JSON.stringify(error.response.data).substring(0, 1000)}`);
					logger.error(`Ollama request payload size was ${payloadSize} chars with ${msgs.length} messages`);
				} else if (error.request) {
					logger.error(`Ollama request failed (no response): ${error.message}`);
				} else {
					logger.error(`Ollama request setup error: ${error.message}`);
				}
				throw error;
			}
		};

		// 3. First call to Ollama including the tools list
		if (onStatusUpdate) {
			onStatusUpdate('Thinking...');
		}
		const response = await callOllama(messages, true);

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
				const toolArgs = call.function.arguments;

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

			// Call Ollama again with the tool results to get the next step
			if (onStatusUpdate) {
				onStatusUpdate(`Thinking... (step ${iteration})`);
			}
			const nextResponse = await callOllama(messages, false);
			message = nextResponse.message;

			// Parse XML tool calls in the subsequent response
			parseXmlToolCalls(message);
		}

		logger.info(`Agent finished after ${iteration} tool-calling iteration(s).`);
		return message.content;
	}, 'Agent reasoning loop failed');
}
