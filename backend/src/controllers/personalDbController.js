import { OKFEngine } from '../okf/okfEngine.js';
import { registry } from '../orchestrator/registry.js';

export const searchPersonalDb = async (req, res) => {
	try {
		const { q } = req.query;
		if (!q || !q.trim()) {
			return res.json({ success: true, facts: [] });
		}

		if (!OKFEngine.initialized) {
			await OKFEngine.initialize();
		}

		const matchedDocs = OKFEngine.match(q);
		const facts = matchedDocs.map(doc => ({
			text: `[${doc.filename}] ${doc.title}:\n${doc.content}`,
			similarity: 1.0
		}));

		res.json({ success: true, facts });
	} catch (error) {
		res.status(500).json({ success: false, error: error.message });
	}
};

export const testOkfRetrieval = async (req, res) => {
	try {
		const { q } = req.query;
		if (!q || !q.trim()) {
			return res.json({ success: true, matchedDocs: [], selectedTools: [] });
		}

		if (!OKFEngine.initialized) {
			await OKFEngine.initialize();
		}

		// 1. Get matched OKF documents
		const matchedDocs = OKFEngine.match(q).map(doc => ({
			filename: doc.filename,
			title: doc.title,
			type: doc.type,
			tags: doc.tags,
			content: doc.content
		}));

		// 2. Get active tools returned by the orchestrator tool selector
		const activeTools = await registry.getRelevantTools(q);
		const selectedTools = activeTools.map(t => {
			const name = t.function?.name || t.name;
			const description = t.function?.description || t.description;
			return { name, description };
		});

		res.json({
			success: true,
			matchedDocs,
			selectedTools
		});
	} catch (error) {
		res.status(500).json({ success: false, error: error.message });
	}
};
