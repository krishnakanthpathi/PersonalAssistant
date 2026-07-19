import { OKFEngine } from '../rag/okfEngine.js';

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
