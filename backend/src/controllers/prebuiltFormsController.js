import { getDB } from '../config/mongodb.js';
import { ObjectId } from 'mongodb';
import { logger } from '../utils/logger.js';

// Default predefined seed cards
const DEFAULT_PREBUILT_FORMS = [
	{
		title: 'Open SSH Terminal',
		description: 'Opens an interactive SSH session in a new terminal window.',
		prompt: 'Open a new terminal window and connect via SSH to host {{host}} as user {{user}}.',
		inputs: [
			{ name: 'host', label: 'Host / IP Address', type: 'text', defaultValue: '127.0.0.1' },
			{ name: 'user', label: 'SSH Username', type: 'text', defaultValue: 'root' }
		],
		isPredefined: true,
		createdAt: new Date()
	},
	{
		title: 'Git Status Check',
		description: 'Run git status on the workspace and summarize changes.',
		prompt: 'Run git status on the project folder and list any modified or untracked files.',
		inputs: [],
		isPredefined: true,
		createdAt: new Date()
	},
	{
		title: 'List Running macOS Apps',
		description: 'Lists all user applications currently running on macOS.',
		prompt: 'List all running user applications on my mac.',
		inputs: [],
		isPredefined: true,
		createdAt: new Date()
	}
];

export const getPrebuiltForms = async (req, res) => {
	try {
		const db = getDB();
		const collection = db.collection('prebuilt_forms');
		
		// Seed default forms if collection is empty
		const count = await collection.countDocuments();
		if (count === 0) {
			logger.info('Seeding default prebuilt forms in MongoDB...');
			await collection.insertMany(DEFAULT_PREBUILT_FORMS);
		}

		const forms = await collection.find().sort({ createdAt: -1 }).toArray();
		res.json({ success: true, forms });
	} catch (error) {
		res.status(500).json({ success: false, error: error.message });
	}
};

export const createPrebuiltForm = async (req, res) => {
	try {
		const { title, description, prompt, inputs = [] } = req.body;
		
		if (!title || !description || !prompt) {
			throw new Error('title, description, and prompt are required');
		}

		const db = getDB();
		const collection = db.collection('prebuilt_forms');

		const newForm = {
			title,
			description,
			prompt,
			inputs,
			isPredefined: false,
			createdAt: new Date()
		};

		const result = await collection.insertOne(newForm);
		res.json({ success: true, form: { ...newForm, _id: result.insertedId } });
	} catch (error) {
		res.status(400).json({ success: false, error: error.message });
	}
};

export const deletePrebuiltForm = async (req, res) => {
	try {
		const { id } = req.params;
		if (!id) throw new Error('ID is required');

		const db = getDB();
		const collection = db.collection('prebuilt_forms');

		const result = await collection.deleteOne({ _id: new ObjectId(id) });
		if (result.deletedCount === 0) {
			throw new Error('Prebuilt form not found');
		}

		res.json({ success: true, message: 'Prebuilt form deleted successfully' });
	} catch (error) {
		res.status(400).json({ success: false, error: error.message });
	}
};

export const updatePrebuiltForm = async (req, res) => {
	try {
		const { id } = req.params;
		const { title, description, prompt, inputs } = req.body;

		if (!id) throw new Error('ID is required');

		const db = getDB();
		const collection = db.collection('prebuilt_forms');

		const updateData = {};
		if (title !== undefined) updateData.title = title;
		if (description !== undefined) updateData.description = description;
		if (prompt !== undefined) updateData.prompt = prompt;
		if (inputs !== undefined) updateData.inputs = inputs;

		const result = await collection.updateOne(
			{ _id: new ObjectId(id) },
			{ $set: updateData }
		);

		if (result.matchedCount === 0) {
			throw new Error('Prebuilt form not found');
		}

		res.json({ success: true, message: 'Prebuilt form updated successfully' });
	} catch (error) {
		res.status(400).json({ success: false, error: error.message });
	}
};

export const toggleFavoritePrebuiltForm = async (req, res) => {
	try {
		const { id } = req.params;
		if (!id) throw new Error('ID is required');

		const db = getDB();
		const collection = db.collection('prebuilt_forms');

		const form = await collection.findOne({ _id: new ObjectId(id) });
		if (!form) {
			throw new Error('Prebuilt form not found');
		}

		const newFavoriteState = !form.isFavorite;

		await collection.updateOne(
			{ _id: new ObjectId(id) },
			{ $set: { isFavorite: newFavoriteState } }
		);

		res.json({ success: true, isFavorite: newFavoriteState });
	} catch (error) {
		res.status(400).json({ success: false, error: error.message });
	}
};
