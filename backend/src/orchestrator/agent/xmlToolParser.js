import { logger } from '../../utils/logger.js';

/**
 * Parses XML-based tool calls if native tool_calls is empty
 * @param {Object} msg - LLM assistant response message object
 */
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
