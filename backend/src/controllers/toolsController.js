import { registry } from '../orchestrator/registry.js';

export const getTools = async (req, res) => {
	try {
		const tools = await registry.getOllamaTools();
		res.json({ success: true, tools });
	} catch (error) {
		res.status(500).json({ success: false, error: error.message });
	}
};
