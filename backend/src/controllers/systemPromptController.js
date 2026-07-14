import { getDB } from '../config/mongodb.js';
import { logger } from '../utils/logger.js';
import { ObjectId } from 'mongodb';

export const getSystemPrompt = async (req, res) => {
	try {
		const db = getDB();
		const collection = db.collection('system_prompts');
		
		const activePromptDoc = await collection.findOne({ isActive: true });
		const rawHistory = await collection.find().sort({ createdAt: -1 }).toArray();
		
		// Map _id to id to retain compatibility with frontend Expectation
		const activePrompt = activePromptDoc ? { ...activePromptDoc, id: activePromptDoc._id.toString() } : null;
		const history = rawHistory.map(h => ({
			...h,
			id: h._id.toString(),
			created_at: h.createdAt ? h.createdAt.toISOString() : null
		}));
		
		res.json({ success: true, activePrompt, history });
	} catch (error) {
		logger.error(`Error fetching system prompts: ${error.message}`);
		res.status(500).json({ success: false, error: error.message });
	}
};

export const saveSystemPrompt = async (req, res) => {
	const { prompt } = req.body;
	if (!prompt || typeof prompt !== 'string') {
		return res.status(400).json({ success: false, error: "Prompt is required and must be a string." });
	}
	try {
		const db = getDB();
		const collection = db.collection('system_prompts');
		
		// Deactivate currently active prompts, then insert new one
		await collection.updateMany({ isActive: true }, { $set: { isActive: false } });
		await collection.insertOne({
			prompt,
			isActive: true,
			createdAt: new Date()
		});
		
		res.json({ success: true });
	} catch (error) {
		logger.error(`Error saving system prompt: ${error.message}`);
		res.status(500).json({ success: false, error: error.message });
	}
};

export const activateSystemPrompt = async (req, res) => {
	const { id } = req.body;
	if (!id) {
		return res.status(400).json({ success: false, error: "ID is required." });
	}
	try {
		const db = getDB();
		const collection = db.collection('system_prompts');
		const objId = new ObjectId(id);
		
		// Deactivate all, then activate selected one
		await collection.updateMany({}, { $set: { isActive: false } });
		await collection.updateOne({ _id: objId }, { $set: { isActive: true } });
		
		res.json({ success: true });
	} catch (error) {
		logger.error(`Error activating system prompt: ${error.message}`);
		res.status(500).json({ success: false, error: error.message });
	}
};

export const deleteSystemPrompt = async (req, res) => {
	const { id } = req.params;
	try {
		const db = getDB();
		const collection = db.collection('system_prompts');
		const objId = new ObjectId(id);
		
		const row = await collection.findOne({ _id: objId });
		if (!row) {
			return res.status(404).json({ success: false, error: "System prompt not found." });
		}
		if (row.isActive === true) {
			return res.status(400).json({ success: false, error: "Cannot delete the active system prompt." });
		}
		
		await collection.deleteOne({ _id: objId });
		res.json({ success: true });
	} catch (error) {
		logger.error(`Error deleting system prompt: ${error.message}`);
		res.status(500).json({ success: false, error: error.message });
	}
};
