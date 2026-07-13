import axios from 'axios';
import OpenAI from 'openai';
import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';
import { metricsService } from '../../utils/metrics.js';

export async function callLLM(msgs, includeTools = false, tools = [], requestId = null) {
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
			if (requestId) {
				metricsService.recordLLMCall(requestId, duration, promptEvalDuration, generatedContent);
			}

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
			if (requestId) {
				metricsService.recordLLMCall(requestId, duration, promptEvalDuration, generatedContent);
			}

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
}
