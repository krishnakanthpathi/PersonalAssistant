import { registry } from '../registry.js';
import { logger } from '../../utils/logger.js';
import { metricsService } from '../../utils/metrics.js';
import { ToolContext } from '../toolContext.js';

/**
 * Parses JSON arguments string into an object safely
 * @param {string|Object} rawArgs 
 * @returns {Object}
 */
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

/**
 * Creates a ToolContext mapping tool progress to frontend status updates
 * @param {string} toolName 
 * @param {Function} onStatusUpdate 
 * @returns {ToolContext}
 */
export function createToolContext(toolName, onStatusUpdate) {
	return new ToolContext((progressInfo) => {
		if (onStatusUpdate) {
			let msg = `Running: ${toolName}`;
			if (typeof progressInfo === 'string') {
				msg += ` (${progressInfo})`;
			} else if (progressInfo && typeof progressInfo === 'object') {
				const { progress, total, message } = progressInfo;
				if (progress !== undefined) {
					if (total !== undefined && total > 0) {
						const pct = Math.round((progress / total) * 100);
						msg += ` (${pct}%`;
						if (message) msg += ` - ${message}`;
						msg += `)`;
					} else {
						msg += ` (${progress}`;
						if (message) msg += ` - ${message}`;
						msg += `)`;
					}
				} else if (message) {
					msg += ` (${message})`;
				}
			}
			onStatusUpdate(msg);
		}
	});
}

/**
 * Executes a tool, handles internal logging/metrics, and returns status + result
 * @param {string} toolName 
 * @param {Object} toolArgs 
 * @param {ToolContext} toolContext 
 * @param {string} requestId 
 * @param {number} toolCallStart 
 * @returns {Promise<{success: boolean, result?: any, error?: string}>}
 */
export async function executeToolWithLogging(toolName, toolArgs, toolContext, requestId, toolCallStart) {
	logger.info(`Agent calling tool: "${toolName}" with arguments: ${JSON.stringify(toolArgs)}`);
	
	const requestStartVal = metricsService.activeRequests.get(requestId)?.startTime || Date.now();
	const latencyFromRequestStart = toolCallStart - requestStartVal;

	try {
		const toolResult = await registry.callTool(toolName, toolArgs, toolContext);
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

		return { success: true, result: toolResult };
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

		return { success: false, error: error.message };
	}
}

/**
 * Formats and appends a successful tool output to messages history
 * @param {Array} messages 
 * @param {Object} call 
 * @param {any} result 
 * @param {string} toolName 
 */
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

/**
 * Formats and appends a failed tool error output to messages history
 * @param {Array} messages 
 * @param {Object} call 
 * @param {string} errorMsg 
 * @param {string} toolName 
 */
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
