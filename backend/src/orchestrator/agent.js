import axios from 'axios';

import { registry } from './registry.js';
import { env } from '../config/env.js';
import { catchErrors } from '../utils/errors.js';

export class Agent {
	run = catchErrors(async (prompt) => {
		// 1. Prepare message history
		const messages = [
			{ role: 'user', content: prompt }
		];

		// 2. Fetch tool definitions
		const tools = await registry.getOllamaTools();


		// 3. First call to Ollama including the tools list
		const response = await axios.post(`${env.OLLAMA_URL}/api/chat`, {
			model: env.OLLAMA_MODEL,
			messages: messages,
			tools: tools,
			stream: false
		});

		let message = response.data.message;

		// 4. Check if Ollama requested any tool execution
		if (message.tool_calls && message.tool_calls.length > 0) {
			// Add assistant message containing the tool calls to history
			messages.push(message);

			for (const call of message.tool_calls) {
				const toolName = call.function.name;
				const toolArgs = call.function.arguments;

				try {
					// Execute the tool (e.g. volume_set)
					const toolResult = await registry.callTool(toolName, toolArgs);

					// Append tool execution response to message history
					messages.push({
						role: 'tool',
						content: String(toolResult),
						name: toolName
					});
				} catch (error) {
					messages.push({
						role: 'tool',
						content: `Error: ${error.message}`,
						name: toolName
					});
				}
			}

			// 5. Call Ollama one more time with the tool results so it can output the final answer
			const secondResponse = await axios.post(`${env.OLLAMA_URL}/api/chat`, {
				model: env.OLLAMA_MODEL,
				messages: messages,
				stream: false
			});
			message = secondResponse.data.message;
		}

		return message.content;
	}, 'Agent reasoning loop failed');
}
