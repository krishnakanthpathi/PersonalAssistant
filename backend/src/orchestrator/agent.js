import axios from 'axios';
import OpenAI from 'openai';
import { registry } from './registry.js';
import { env } from '../config/env.js';
import { catchErrors } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import { saySpeechTool } from '../tools/mac/saySpeech.js';
import { metricsService } from '../utils/metrics.js';
import { db } from '../utils/db.js';

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

		// Start tracking metrics
		const requestId = metricsService.startRequest(prompt);

		try {
			// Load system prompt from DB
			let systemPromptText;
			try {
				const row = db.prepare("SELECT prompt FROM system_prompts WHERE is_active = 1 ORDER BY id DESC LIMIT 1").get();
				systemPromptText = row?.prompt;
			} catch (error) {
				logger.error(`Failed to load system prompt from DB: ${error.message}`);
			}

			if (!systemPromptText) {
				// Fallback default
				systemPromptText = `You are a local computer personal assistant running on macOS. You have access to tools. If you need to call a tool, you MUST use the native tool-calling feature.

## Response Formatting & Voice Output (IMPORTANT)
Every response you generate MUST be split into two sections:
1. <speech>: A concise, conversational sentence or two describing what you are doing or what you have found, written exactly as you want it spoken out loud to the user. Keep it natural and short. Do not include markdown, URLs, symbols, or formatting in this section, as it will be read aloud.
2. <action>: A detailed description of the outcome, findings, and any actions taken. You can use rich markdown formatting, lists, code blocks, or system information here.

Example:
<speech>
I've updated your system volume to fifty percent.
</speech>
<action>
### System Volume Updated
- **Old Volume**: 20%
- **New Volume**: 50%
- **Status**: Success
</action>

## UI Automation Workflow (IMPORTANT)
When you need to interact with a desktop application's UI (click buttons, select contacts, fill inputs, press Send):
1. After opening the app, ALWAYS call \`annotate_screen\` first to get a visual blueprint of the current screen with all element coordinates.
2. Use the returned element map to identify the EXACT (x, y) coordinates of the target element (button, text field, contact, etc.).
3. Call \`move_mouse\` with action="click" and the identified (x, y) to click that element.
4. If you need to type in a field, click it first with \`move_mouse\`, then use \`keystroke_action\` with action="type".
5. To press Enter/Escape/Space use \`keystroke_action\` with action="press" or "shortcut" and the key name.
6. If the screen changes (new page loaded, dialog opened), call \`annotate_screen\` again before clicking anything.
7. After searching for a contact, ALWAYS call \`annotate_screen\` to SEE the search results and find the contact's exact coordinates before clicking.
8. NEVER guess at coordinates — always use \`annotate_screen\` or \`get_ui_elements\` to determine them first.

## Chrome Browser Links (IMPORTANT)
- Whenever you need to open any web link, you must open it in a new tab in Google Chrome.
- You can do this by using a direct browser tool call, or by running a command/AppleScript to open Chrome, opening a new tab (e.g. Command+T), and pasting the link.

## Presentation of Tabular Data (IMPORTANT)
- Whenever you need to present lists of steps, comparisons, schedules, or structured tabular data, you MUST format them as a raw HTML table (using \`<table>\`, \`<thead>\`, \`<tbody>\`, \`<tr>\`, \`<th>\`, and \`<td>\` tags).
- Do not use markdown pipes (\`|\`) or dashes (\`---\`) for tables.
- Example:
  <table>
    <thead>
      <tr>
        <th>Item</th>
        <th>Description</th>
        <th>Cost</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Apple Mac</td>
        <td>Computer assistant</td>
        <td>$1200</td>
      </tr>
    </tbody>
  </table>

## File System Operations
You can view, create, edit, search, or list files and directories in the local workspace directory.

## Notion Operations
The default parent page ID is "${env.NOTION_PARENT_PAGE_ID || ''}". Use this ID when creating new pages or retrieving notes unless specified otherwise.

## Google Calendar Operations
You can read, create, update, delete, and list events on Google Calendar.

## YouTube Operations
You can search for YouTube videos and retrieve video transcripts. Use these tools when the user asks about video content, queries topic summaries, or requests transcripts.`;
			}

			// 1. Prepare message history
			const messages = [
				{
					role: 'system',
					content: systemPromptText
				},
				...cleanedHistory,
				{ role: 'user', content: prompt }
			];

			// Generate a search query for tool selection that combines previous user inputs
			// to maintain context (e.g. if the user says "set it to 50" after "set volume to 80")
			const userMessages = cleanedHistory.filter(m => m.role === 'user').slice(-2);
			const combinedRAGQuery = [...userMessages.map(m => m.content), prompt].join(' ');

			// 2. Fetch tool definitions using RAG selection
			const retrievalStart = Date.now();
			const tools = await registry.getRelevantTools(combinedRAGQuery);
			const retrievalDuration = Date.now() - retrievalStart;
			metricsService.recordRetrievalTime(requestId, retrievalDuration);
			logger.info(`Loaded ${tools.length} tools for agent`);

			// Record Given Context (System + History + Query + Available Tools)
			const givenContextText = `[System Prompt]\n${messages[0].content}\n\n[Chat History]\n${JSON.stringify(cleanedHistory, null, 2)}\n\n[Prompt]\n${prompt}\n\n[Relevant Tools from RAG]\n${tools.map(t => `- ${t.function?.name || t.name}: ${t.function?.description || t.description}`).join('\n')}`;
			metricsService.recordGivenContext(requestId, givenContextText);

			const MAX_ITERATIONS = 15;
			let iteration = 0;

			// Helper to call LLM (Ollama or OpenAI) with detailed logging
			const callLLM = async (msgs, includeTools = false) => {
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
						logger.debug(`OpenAI response content (first 500 chars): ${(responseMessage.content || '').substring(0, 500)}`);
						
						generatedContent = responseMessage.content || '';
						if (responseMessage.tool_calls) {
							generatedContent += '\nTool Calls: ' + JSON.stringify(responseMessage.tool_calls.map(tc => tc.function.name));
						}
						metricsService.recordLLMCall(requestId, duration, promptEvalDuration, generatedContent);

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
						metricsService.recordLLMCall(requestId, duration, promptEvalDuration, generatedContent);

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

					const toolCallStart = Date.now();
					const requestStartVal = metricsService.activeRequests.get(requestId)?.startTime || Date.now();
					const latencyFromRequestStart = toolCallStart - requestStartVal;

					try {
						// Execute the tool (local or MCP)
						const toolResult = await registry.callTool(toolName, toolArgs);
						const toolLatency = Date.now() - toolCallStart;
						logger.info(`Tool "${toolName}" executed successfully. Result length: ${String(toolResult).length} characters.`);

						metricsService.recordToolCall(requestId, {
							name: toolName,
							args: toolArgs,
							latency: toolLatency,
							latencyFromRequestStart,
							success: true,
							result: toolResult
						});

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
						const toolLatency = Date.now() - toolCallStart;
						logger.error(`Tool "${toolName}" failed to execute: ${error.message}`);
						
						metricsService.recordToolCall(requestId, {
							name: toolName,
							args: toolArgs,
							latency: toolLatency,
							latencyFromRequestStart,
							success: false,
							error: error.message
						});

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
			metricsService.endRequest(requestId, true);

			const parsed = parseAgentResponse(message.content || '');
			if (parsed.speech) {
				logger.info(`Manually triggering speech synthesizer for: "${parsed.speech}"`);
				saySpeechTool.execute({ text: parsed.speech }).catch(err => {
					logger.error(`Manual speech execution failed: ${err.message}`);
				});
			}

			return parsed;
		} catch (error) {
			metricsService.endRequest(requestId, false, error.message);
			throw error;
		}
	}, 'Agent reasoning loop failed');
}

function parseAgentResponse(rawContent) {
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

	// Fallbacks if tags are missing
	if (!speechMatch && !actionMatch) {
		// If no tags at all, treat the entire thing as the action, and speech is a simplified summary
		action = rawContent.trim();
		speech = cleanTextForSpeech(action);
	} else if (speechMatch && !actionMatch) {
		// If only speech tag is present, treat the rest of the text as action
		action = rawContent.replace(/<speech>[\s\S]*?<\/speech>/gi, '').trim();
	} else if (!speechMatch && actionMatch) {
		// If only action tag is present
		action = actionMatch[1].trim();
		speech = cleanTextForSpeech(action);
	}

	return { speech, content: action };
}

function cleanTextForSpeech(text) {
	let clean = text
		.replace(/```[\s\S]*?```/g, '') // remove code blocks
		.replace(/`([^`]+)`/g, '$1') // remove inline code backticks
		.replace(/[#*_\-]/g, '') // remove markdown symbols
		.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // remove links, keep text
		.split('\n')
		.map(line => line.trim())
		.filter(line => line.length > 0)
		.join('. ');

	// Limit speech to first 2 sentences for clean voice output
	const sentences = clean.split(/[.!?]+/);
	return sentences.slice(0, 2).join('. ').trim();
}

