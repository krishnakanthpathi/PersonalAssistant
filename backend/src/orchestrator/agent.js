import { registry } from './registry.js';
import { catchErrors } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import { metricsService } from '../utils/metrics.js';

import {
	prepareMessages,
	callLLM,
	parseXmlToolCalls,
	parseToolArguments,
	createToolContext,
	executeToolWithLogging,
	appendToolSuccessMessage,
	appendToolErrorMessage,
	parseAgentResponse
} from './commonFunctions.js';

export class Agent {
	/**
	 * Run the agent reasoning loop for a given prompt
	 * @param {string} prompt 
	 * @param {Array} history 
	 * @param {Function} onStatusUpdate 
	 */
	run = catchErrors(async (prompt, history = [], onStatusUpdate = null, shouldStop = null, images = [], onMetadataRetrieved = null) => {
		const requestId = metricsService.startRequest(prompt);
		const logs = [];
		const triggerStatusUpdate = (status) => {
			if (status && !logs.includes(status)) {
				logs.push(status);
			}
			if (onStatusUpdate) {
				onStatusUpdate(status);
			}
		};

		const checkAborted = () => {
			if (shouldStop && shouldStop()) {
				throw new Error('Agent execution was stopped by user.');
			}
		};

		try {
			checkAborted();

			// 1. Prepare message history and RAG search query
			const { messages, cleanedHistory, combinedRAGQuery, ragFacts } = await prepareMessages(prompt, history, images);

			// 2. Fetch tool definitions using RAG selection
			const retrievalStart = Date.now();
			const tools = await registry.getRelevantTools(combinedRAGQuery);
			const retrievalDuration = Date.now() - retrievalStart;
			metricsService.recordRetrievalTime(requestId, retrievalDuration);

			if (onMetadataRetrieved) {
				onMetadataRetrieved({
					ragFacts: ragFacts || [],
					relevantTools: tools ? tools.map(t => ({
						name: t.name || t.function?.name,
						description: t.description || t.function?.description
					})) : []
				});
			}

			// Record Given Context (System + History + Query + Available Tools)
			const givenContextText = `[System Prompt]\n${messages[0].content}\n\n[Chat History]\n${JSON.stringify(cleanedHistory, null, 2)}\n\n[Prompt]\n${prompt}\n\n[Relevant Tools from RAG]\n${tools.map(t => `- ${t.function?.name || t.name}: ${t.function?.description || t.description}`).join('\n')}`;
			metricsService.recordGivenContext(requestId, givenContextText);

			const MAX_ITERATIONS = 150;
			let iteration = 0;

			// 3. First call to LLM including the tools list
			checkAborted();
			triggerStatusUpdate('Thinking...');
			const response = await callLLM(messages, true, tools, requestId);
			let message = response.message;

			// Parse XML tool calls in the initial response
			parseXmlToolCalls(message, tools);

			// Keep executing tool calls as long as the model requests them (Reasoning Loop)
			while (message.tool_calls && message.tool_calls.length > 0) {
				checkAborted();
				iteration++;

				if (iteration > MAX_ITERATIONS) {
					logger.warn(`Reasoning loop exceeded max iterations (${MAX_ITERATIONS}). Breaking out.`);
					message.content = message.content || `I completed ${iteration - 1} steps but stopped to avoid an infinite loop. Here's what I accomplished so far.`;
					break;
				}

				messages.push(message);

				for (const call of message.tool_calls) {
					checkAborted();
					const toolName = call.function.name;
					const toolArgs = parseToolArguments(call.function.arguments);
					const toolContext = createToolContext(toolName, triggerStatusUpdate);

					const toolCallStart = Date.now();
					const { success, result, error } = await executeToolWithLogging(toolName, toolArgs, toolContext, requestId, toolCallStart, triggerStatusUpdate);

					if (success) {
						appendToolSuccessMessage(messages, call, result, toolName);
					} else {
						appendToolErrorMessage(messages, call, error, toolName);
					}
				}

				checkAborted();
				triggerStatusUpdate(`Thinking... (step ${iteration})`);
				const nextResponse = await callLLM(messages, true, tools, requestId);
				message = nextResponse.message;

				parseXmlToolCalls(message, tools);
			}

			metricsService.endRequest(requestId, true);

			const parsed = parseAgentResponse(message.content || '');
			if (parsed.speech) {
				registry.callTool('say_speech', { text: parsed.speech }).catch(err => {
					logger.error(`Manual speech execution failed: ${err.message}`);
				});
			}

			return {
				...parsed,
				logs,
				ragFacts: ragFacts || [],
				relevantTools: tools ? tools.map(t => ({
					name: t.name || t.function?.name,
					description: t.description || t.function?.description
				})) : []
			};
		} catch (error) {
			metricsService.endRequest(requestId, false, error.message);
			throw error;
		}
	}, 'Agent reasoning loop failed');
}
