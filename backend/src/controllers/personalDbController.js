import { PersonalInfoVectorDB } from '../rag/personalDb.js';
import { Embedder } from '../rag/embedder.js';
import { env } from '../config/env.js';

export const searchPersonalDb = async (req, res) => {
	try {
		const { q } = req.query;
		if (!q || !q.trim()) {
			return res.json({ success: true, facts: [] });
		}

		const personalDb = new PersonalInfoVectorDB();
		await personalDb.connect();

		const embedder = new Embedder();
		const queryEmbedding = await embedder.embed(q);

		const results = await personalDb.query(queryEmbedding, env.RAG_PERSONAL_DB_LIMIT || 10);

		if (!results || !results.documents || !results.documents[0] || results.documents[0].length === 0) {
			return res.json({ success: true, facts: [] });
		}

		const facts = [];
		for (let i = 0; i < results.documents[0].length; i++) {
			const doc = results.documents[0][i];
			const distance = results.distances[0][i];
			const similarity = 1 - distance;

			facts.push({
				text: doc,
				similarity: parseFloat(similarity.toFixed(4))
			});
		}

		res.json({ success: true, facts });
	} catch (error) {
		res.status(500).json({ success: false, error: error.message });
	}
};
