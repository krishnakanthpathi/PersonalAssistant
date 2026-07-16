import { env } from '../config/env.js';
import { platform } from 'os';
import { getDB } from '../config/mongodb.js';
import OpenAI from 'openai';
import axios from 'axios';

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

export const getAvailableModels = async (req, res) => {
	try {
		let { provider, apiKey, baseUrl } = req.query;

		let dbSettings = {};
		try {
			const db = getDB();
			dbSettings = await db.collection('app_config').findOne({ _id: 'llm_settings' }) || {};
		} catch (e) {
			// MongoDB might not be connected or collection empty
		}

		// Use query params if provided, otherwise fallback to database config, then env variables
		const targetProvider = provider || dbSettings.provider || env.LLM_PROVIDER || 'ollama';

		let models = [];
		let fetchError = null;

		if (targetProvider === 'openai') {
			const targetKey = apiKey || dbSettings.openaiApiKey || env.OPENAI_API_KEY;
			const targetUrl = baseUrl !== undefined ? baseUrl : (dbSettings.openaiBaseUrl || env.OPENAI_BASE_URL);

			if (!targetKey) {
				// No key, return default fallback list with only the 120B model
				models = [
					'openai.gpt-oss-safeguard-120b'
				];
				if (dbSettings.openaiModel && !models.includes(dbSettings.openaiModel)) {
					models.unshift(dbSettings.openaiModel);
				}
			} else {
				try {
					const cleanUrl = (targetUrl && targetUrl !== 'default' && targetUrl.trim() !== '') ? targetUrl : undefined;
					const openaiInstance = new OpenAI({
						apiKey: targetKey,
						baseURL: cleanUrl
					});

					const response = await openaiInstance.models.list();
					models = response.data.map(m => m.id);
				} catch (err) {
					fetchError = err.message;
					// Fallback list on error with only the 120B model
					models = [
						'openai.gpt-oss-safeguard-120b'
					];
					if (dbSettings.openaiModel && !models.includes(dbSettings.openaiModel)) {
						models.unshift(dbSettings.openaiModel);
					}
				}
			}
		} else if (targetProvider === 'grok') {
			const targetKey = apiKey || dbSettings.grokApiKey || env.GROK_API_KEY;
			const targetUrl = baseUrl !== undefined ? baseUrl : (dbSettings.grokBaseUrl || env.GROK_BASE_URL || 'https://api.groq.com/openai/v1');

			if (!targetKey) {
				models = [
					'openai/gpt-oss-120b'
				];
				if (dbSettings.grokModel && !models.includes(dbSettings.grokModel)) {
					models.unshift(dbSettings.grokModel);
				}
			} else {
				try {
					const cleanUrl = (targetUrl && targetUrl !== 'default' && targetUrl.trim() !== '') ? targetUrl : undefined;
					const grokInstance = new OpenAI({
						apiKey: targetKey,
						baseURL: cleanUrl
					});

					const response = await grokInstance.models.list();
					models = response.data.map(m => m.id);
				} catch (err) {
					fetchError = err.message;
					models = [
						'openai/gpt-oss-120b'
					];
					if (dbSettings.grokModel && !models.includes(dbSettings.grokModel)) {
						models.unshift(dbSettings.grokModel);
					}
				}
			}
		} else if (targetProvider === 'ollama') {
			const targetUrl = baseUrl || dbSettings.ollamaUrl || env.OLLAMA_URL || 'http://localhost:11434';
			try {
				const response = await axios.get(`${targetUrl}/api/tags`, { timeout: 3000 });
				if (response.data && response.data.models) {
					models = response.data.models.map(m => m.name);
				} else {
					models = [];
				}
			} catch (err) {
				fetchError = err.message;
				models = [
					'llama3.1',
					'llama3.2',
					'gemma2',
					'phi3',
					'mistral'
				];
				if (dbSettings.ollamaModel && !models.includes(dbSettings.ollamaModel)) {
					models.unshift(dbSettings.ollamaModel);
				}
			}
		} else {
			return res.status(400).json({ success: false, error: `Unsupported LLM Provider: ${targetProvider}` });
		}

		// Sort models alphabetically
		models.sort();

		res.json({
			success: true,
			provider: targetProvider,
			models,
			error: fetchError
		});
	} catch (error) {
		res.json({ success: false, error: error.message, models: [] });
	}
};
