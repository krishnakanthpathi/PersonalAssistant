import { registry } from './registry.js';
import { catchErrors } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import { saySpeechTool } from '../tools/mac/saySpeech.js';
import { metricsService } from '../utils/metrics.js';

// Imported controllers
import { prepareMessages } from './agent/promptManager.js';
import { callLLM } from './agent/llmClient.js';
import { parseAgentResponse } from './agent/responseParser.js';
import { parseXmlToolCalls } from './agent/xmlToolParser.js';
import {
	parseToolArguments,
	createToolContext,
	executeToolWithLogging,
	appendToolSuccessMessage,
	appendToolErrorMessage
} from './agent/toolExecutor.js';

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

		// Start tracking metrics
		const requestId = metricsService.startRequest(prompt);

		try {
			// 1. Prepare message history and RAG search query
			const { messages, cleanedHistory, combinedRAGQuery } = await prepareMessages(prompt, history);

			// 2. Fetch tool definitions using RAG selection
			const retrievalStart = Date.now();
			const tools = await registry.getRelevantTools(combinedRAGQuery);
			const retrievalDuration = Date.now() - retrievalStart;
			metricsService.recordRetrievalTime(requestId, retrievalDuration);

			// Record Given Context (System + History + Query + Available Tools)
			const givenContextText = `[System Prompt]\n${messages[0].content}\n\n[Chat History]\n${JSON.stringify(cleanedHistory, null, 2)}\n\n[Prompt]\n${prompt}\n\n[Relevant Tools from RAG]\n${tools.map(t => `- ${t.function?.name || t.name}: ${t.function?.description || t.description}`).join('\n')}`;
			metricsService.recordGivenContext(requestId, givenContextText);

			const MAX_ITERATIONS = 15;
			let iteration = 0;

			// 3. First call to LLM including the tools list
			if (onStatusUpdate) {
				onStatusUpdate('Thinking...');
			}
			const response = await callLLM(messages, true, tools, requestId);
			let message = response.message;

			if (message.content && onStatusUpdate) {
				onStatusUpdate(message.content);
			}

			// Parse XML tool calls in the initial response
			parseXmlToolCalls(message);

			// Keep executing tool calls as long as the model requests them (Reasoning Loop)
			while (message.tool_calls && message.tool_calls.length > 0) {
				iteration++;

				if (iteration > MAX_ITERATIONS) {
					logger.warn(`Reasoning loop exceeded max iterations (${MAX_ITERATIONS}). Breaking out.`);
					message.content = message.content || `I completed ${iteration - 1} steps but stopped to avoid an infinite loop. Here's what I accomplished so far.`;
					break;
				}

				// Add assistant message containing the tool calls to history
				messages.push(message);

				for (const call of message.tool_calls) {
					const toolName = call.function.name;
					const toolArgs = parseToolArguments(call.function.arguments);

					// Create a ToolContext for progress updates
					const toolContext = createToolContext(toolName, onStatusUpdate);

					if (onStatusUpdate) {
						onStatusUpdate(`Running: ${toolName}`);
					}

					const toolCallStart = Date.now();
					const { success, result, error } = await executeToolWithLogging(toolName, toolArgs, toolContext, requestId, toolCallStart);

					if (success) {
						appendToolSuccessMessage(messages, call, result, toolName);
					} else {
						appendToolErrorMessage(messages, call, error, toolName);
					}
				}

				// Call LLM again with the tool results to get the next step
				if (onStatusUpdate) {
					onStatusUpdate(`Thinking... (step ${iteration})`);
				}
				const nextResponse = await callLLM(messages, false, tools, requestId);
				message = nextResponse.message;

				if (message.content && onStatusUpdate) {
					onStatusUpdate(message.content);
				}

				// Parse XML tool calls in the subsequent response
				parseXmlToolCalls(message);
			}

			metricsService.endRequest(requestId, true);

			const parsed = parseAgentResponse(message.content || '');
			if (parsed.speech) {
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
