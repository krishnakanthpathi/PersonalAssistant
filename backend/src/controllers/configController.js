import { env } from '../config/env.js';
import { platform } from 'os';

export const getStatus = (req, res) => {
	res.json({
		status: true,
		os: platform(),
		message: "Server is running"
	});
};

export const getConfig = (req, res) => {
	res.json({
		success: true,
		provider: env.LLM_PROVIDER,
		model: env.LLM_PROVIDER === 'openai' ? env.OPENAI_MODEL : env.OLLAMA_MODEL,
		openaiBaseUrl: env.OPENAI_BASE_URL || 'default',
		port: env.PORT
	});
};
