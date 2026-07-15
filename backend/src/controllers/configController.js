import { env } from '../config/env.js';
import { platform } from 'os';
import { getDB } from '../config/mongodb.js';

export const getStatus = (req, res) => {
	res.json({
		status: true,
		os: platform(),
		message: "Server is running"
	});
};

export const getConfig = async (req, res) => {
	try {
		let dbSettings = {};
		try {
			const db = getDB();
			dbSettings = await db.collection('app_config').findOne({ _id: 'llm_settings' }) || {};
		} catch (e) {
			// MongoDB might not be connected or collection empty
		}

		res.json({
			success: true,
			provider: env.LLM_PROVIDER,
			model: env.LLM_PROVIDER === 'openai' ? env.OPENAI_MODEL : (env.LLM_PROVIDER === 'grok' ? env.GROK_MODEL : env.OLLAMA_MODEL),
			openaiBaseUrl: env.OPENAI_BASE_URL || 'default',
			port: env.PORT,
			settings: {
				provider: env.LLM_PROVIDER,
				openaiApiKey: dbSettings.openaiApiKey || env.OPENAI_API_KEY || '',
				openaiBaseUrl: dbSettings.openaiBaseUrl || env.OPENAI_BASE_URL || '',
				openaiModel: dbSettings.openaiModel || env.OPENAI_MODEL || '',
				ollamaUrl: dbSettings.ollamaUrl || env.OLLAMA_URL || '',
				ollamaModel: dbSettings.ollamaModel || env.OLLAMA_MODEL || '',
				grokApiKey: dbSettings.grokApiKey || env.GROK_API_KEY || '',
				grokBaseUrl: dbSettings.grokBaseUrl || env.GROK_BASE_URL || '',
				grokModel: dbSettings.grokModel || env.GROK_MODEL || ''
			}
		});
	} catch (error) {
		res.status(500).json({ success: false, error: error.message });
	}
};

export const updateConfig = async (req, res) => {
	try {
		const {
			provider,
			openaiApiKey,
			openaiBaseUrl,
			openaiModel,
			ollamaUrl,
			ollamaModel,
			grokApiKey,
			grokBaseUrl,
			grokModel
		} = req.body;

		// Validate provider
		if (provider && !['openai', 'ollama', 'grok'].includes(provider)) {
			return res.status(400).json({ success: false, error: 'Invalid provider value. Must be openai, ollama, or grok.' });
		}

		const db = getDB();
		const updateData = {};
		if (provider !== undefined) updateData.provider = provider;
		if (openaiApiKey !== undefined) updateData.openaiApiKey = openaiApiKey;
		if (openaiBaseUrl !== undefined) updateData.openaiBaseUrl = openaiBaseUrl;
		if (openaiModel !== undefined) updateData.openaiModel = openaiModel;
		if (ollamaUrl !== undefined) updateData.ollamaUrl = ollamaUrl;
		if (ollamaModel !== undefined) updateData.ollamaModel = ollamaModel;
		if (grokApiKey !== undefined) updateData.grokApiKey = grokApiKey;
		if (grokBaseUrl !== undefined) updateData.grokBaseUrl = grokBaseUrl;
		if (grokModel !== undefined) updateData.grokModel = grokModel;

		await db.collection('app_config').updateOne(
			{ _id: 'llm_settings' },
			{ $set: updateData },
			{ upsert: true }
		);

		// Dynamically update the in-memory env configurations
		if (provider !== undefined) env.LLM_PROVIDER = provider;
		if (openaiApiKey !== undefined) env.OPENAI_API_KEY = openaiApiKey;
		if (openaiBaseUrl !== undefined) env.OPENAI_BASE_URL = openaiBaseUrl;
		if (openaiModel !== undefined) env.OPENAI_MODEL = openaiModel;
		if (ollamaUrl !== undefined) env.OLLAMA_URL = ollamaUrl;
		if (ollamaModel !== undefined) env.OLLAMA_MODEL = ollamaModel;
		if (grokApiKey !== undefined) env.GROK_API_KEY = grokApiKey;
		if (grokBaseUrl !== undefined) env.GROK_BASE_URL = grokBaseUrl;
		if (grokModel !== undefined) env.GROK_MODEL = grokModel;

		res.json({
			success: true,
			message: 'Configuration updated successfully',
			config: {
				provider: env.LLM_PROVIDER,
				model: env.LLM_PROVIDER === 'openai' ? env.OPENAI_MODEL : (env.LLM_PROVIDER === 'grok' ? env.GROK_MODEL : env.OLLAMA_MODEL),
				openaiBaseUrl: env.OPENAI_BASE_URL || 'default',
				port: env.PORT
			}
		});
	} catch (error) {
		res.status(500).json({ success: false, error: error.message });
	}
};
