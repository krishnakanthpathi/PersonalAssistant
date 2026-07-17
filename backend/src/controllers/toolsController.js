import { registry } from '../orchestrator/registry.js';

export const getTools = async (req, res) => {
	try {
		const tools = await registry.getOllamaTools();
		res.json({ success: true, tools });
	} catch (error) {
		res.status(500).json({ success: false, error: error.message });
	}
};

export const searchTools = async (req, res) => {
	try {
		const { q } = req.query;
		const tools = await registry.getRelevantTools(q);
		res.json({ success: true, tools });
	} catch (error) {
		res.status(500).json({ success: false, error: error.message });
	}
};
