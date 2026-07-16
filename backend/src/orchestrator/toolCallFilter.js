import { logger } from '../utils/logger.js';

/**
 * Classifies the active model and provider to determine the tool calling strategy
 * @param {string} provider 
 * @param {string} model 
 * @param {string} baseUrl 
 * @returns {{ strategy: 'native' | 'xml' | 'none' }}
 */
export function getToolCallingCapability(provider, model, baseUrl = '') {
	logger.info(`Classifying tool capability: provider=${provider}, model=${model}, baseUrl=${baseUrl}`);
	
	let strategy = 'native';

	if (provider === 'openai') {
		const lowerModel = (model || '').toLowerCase();
		const lowerUrl = (baseUrl || '').toLowerCase();

		// GLM models support native tool calling on Bedrock/Mantle and standard endpoints
		if (lowerModel.includes('glm')) {
			strategy = 'native';
		} else if (
			lowerUrl.includes('bedrock') || 
			lowerUrl.includes('mantle') ||
			lowerModel.includes('minimax') || 
			lowerModel.includes('safeguard') || 
			lowerModel.includes('gemma-3') ||
			lowerModel.includes('deepseek-r1')
		) {
			strategy = 'xml';
		}
	} else if (provider === 'grok') {
		const lowerModel = (model || '').toLowerCase();
		// If Groq is running reasoning models (like R1), default to xml
		if (lowerModel.includes('r1') || lowerModel.includes('deepseek')) {
			strategy = 'xml';
		} else {
			strategy = 'native';
		}
	} else if (provider === 'ollama') {
		const lowerModel = (model || '').toLowerCase();
		// Ollama native function calling is supported in llama3.1, llama3.2, qwen2.5.
		// For others (phi3, gemma2, gemma-3, deepseek-r1, etc.), use XML
		const supportsNative = ['llama3.1', 'llama3.2', 'qwen2.5', 'qwen2-5', 'llama-3.1', 'llama-3.2'].some(pat => lowerModel.includes(pat));
		if (supportsNative) {
			strategy = 'native';
		} else {
			strategy = 'xml';
		}
	}

	logger.info(`Determined tool calling strategy: "${strategy}" for model "${model}"`);
	return { strategy };
}

/**
 * Standardizes and cleans up the JSON schema of a tool to avoid API parser crashes
 * @param {Object} tool 
 * @returns {Object} Cleaned tool definition
 */
export function standardizeToolSchema(tool) {
	// Deep clone tool to avoid mutating registry data
	const cloned = JSON.parse(JSON.stringify(tool));
	
	if (!cloned.function) {
		return cloned;
	}

	const fn = cloned.function;

	// Ensure function description is non-empty
	if (!fn.description || fn.description.trim() === '') {
		fn.description = `Helper tool: ${fn.name}`;
	}
	
	// Ensure parameter schema exists
	if (!fn.parameters) {
		fn.parameters = {
			type: 'object',
			properties: {}
		};
	}

	// Ensure top level type is object
	if (!fn.parameters.type) {
		fn.parameters.type = 'object';
	}

	// Clean parameters properties
	if (fn.parameters.properties) {
		for (const key of Object.keys(fn.parameters.properties)) {
			const prop = fn.parameters.properties[key];
			
			// Clean up unsupported fields in schemas
			if (prop) {
				delete prop.format;
				delete prop.example;
				delete prop.default;

				// Ensure property description is non-empty (GLM requirement)
				if (!prop.description || prop.description.trim() === '') {
					prop.description = `Parameter: ${key}`;
				}
			}
		}
	}

	// Clean required array: delete if empty
	if (fn.parameters.required) {
		if (!Array.isArray(fn.parameters.required) || fn.parameters.required.length === 0) {
			delete fn.parameters.required;
		}
	}

	// Clean additionalProperties: some models/gateways reject it
	delete fn.parameters.additionalProperties;

	return cloned;
}

/**
 * Injects XML tool instructions and schemas into the system prompt message
 * @param {Array} messages 
 * @param {Array} tools 
 * @returns {Array} Cloned messages list with system prompt updated
 */
export function injectXmlToolsInstructions(messages, tools) {
	if (!tools || tools.length === 0) {
		return messages;
	}

	// Format tool definitions as a clean, readable text block
	const toolDescriptions = tools.map(t => {
		const name = t.function?.name || t.name;
		const desc = t.function?.description || t.description || '';
		const params = t.function?.parameters || {};
		return `### Tool: ${name}\nDescription: ${desc}\nParameters Schema:\n\`\`\`json\n${JSON.stringify(params, null, 2)}\n\`\`\``;
	}).join('\n\n');

	const xmlInstructions = `
## Tool Calling Capability (XML Fallback Mode)
You have access to a set of helper tools. You are allowed to call these tools to fulfill the user's request.
Since this model does not support native JSON tool-calling parameters, you MUST invoke tools using XML tags in your response content.

To call a tool, format your request exactly like this in your output:
<tool_call>
{
  "name": "tool_name",
  "arguments": {
    "arg_name": "arg_value"
  }
}
</tool_call>

Important Rules:
1. Wrap the entire tool call JSON object inside the <tool_call> and </tool_call> tags.
2. The inside must be a valid JSON object matching the tool's parameter schema.
3. You can execute multiple tool calls in a single turn if needed, by repeating the <tool_call> block.
4. After you invoke a tool, wait for the user/system to respond with the tool result inside <tool_response> tags. Do not hallucinate the tool response yourself.

Here is the list of available tools:

${toolDescriptions}
`;

	// Deep clone the messages array
	const clonedMessages = JSON.parse(JSON.stringify(messages));
	const systemMsg = clonedMessages.find(m => m.role === 'system');

	if (systemMsg) {
		systemMsg.content = `${systemMsg.content}\n\n${xmlInstructions}`;
	} else {
		// If no system prompt exists, prepend one
		clonedMessages.unshift({
			role: 'system',
			content: xmlInstructions
		});
	}

	return clonedMessages;
}

/**
 * Prepares and cleans the messages list for the API payload based on strategy
 * @param {Array} messages 
 * @param {string} strategy 
 * @returns {Array} Cleaned messages list
 */
export function prepareMessagesPayload(messages, strategy) {
	const cloned = JSON.parse(JSON.stringify(messages));

	if (strategy !== 'native') {
		for (const msg of cloned) {
			// Strip tool_calls property from assistant messages to avoid validation issues
			if (msg.role === 'assistant' && msg.tool_calls) {
				delete msg.tool_calls;
			}
			// Convert any 'tool' role messages to 'user' role with xml formatting
			if (msg.role === 'tool') {
				msg.role = 'user';
				msg.content = `<tool_response>\n${msg.content}\n</tool_response>`;
				delete msg.tool_call_id;
				delete msg.name;
			}
		}
	} else {
		// For native, ensure all tool calls have function type and valid ID
		for (const msg of cloned) {
			if (msg.role === 'assistant' && msg.tool_calls) {
				for (const tc of msg.tool_calls) {
					if (!tc.type) {
						tc.type = 'function';
					}
					if (!tc.id) {
						tc.id = 'call_' + Math.random().toString(36).substr(2, 9);
					}
				}
			}
		}
	}

	return cloned;
}
