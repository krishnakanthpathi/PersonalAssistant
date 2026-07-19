import { getDB } from '../config/mongodb.js';
import { executeDynamicSkill } from '../utils/skillEvaluator.js';
import { callLLM } from '../orchestrator/commonFunctions.js';
import { logger } from '../utils/logger.js';
import { ObjectId } from 'mongodb';

// Get all custom skills
export const getSkills = async (req, res) => {
	try {
		const db = getDB();
		const skills = await db.collection('skills').find().sort({ name: 1 }).toArray();
		res.json({ success: true, skills });
	} catch (error) {
		logger.error(`Error in getSkills: ${error.message}`);
		res.status(500).json({ success: false, error: error.message });
	}
};

// Create a new skill
export const createSkill = async (req, res) => {
	try {
		const { name, description, parameters, code } = req.body;
		if (!name || !description || !code) {
			return res.status(400).json({ success: false, error: 'Name, description, and code are required.' });
		}
		
		// Validate name matches variable naming rules
		if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
			return res.status(400).json({ success: false, error: 'Skill name must be a valid snake_case identifier (letters, numbers, underscores, starting with letter/underscore).' });
		}

		const db = getDB();
		
		// Check for duplicates
		const existing = await db.collection('skills').findOne({ name });
		if (existing) {
			return res.status(400).json({ success: false, error: `A skill with name "${name}" already exists.` });
		}

		const skillDoc = {
			name,
			description,
			parameters: parameters || { type: 'object', properties: {}, required: [] },
			code,
			createdAt: new Date(),
			updatedAt: new Date()
		};

		const result = await db.collection('skills').insertOne(skillDoc);
		res.json({ success: true, skillId: result.insertedId, skill: skillDoc });
	} catch (error) {
		logger.error(`Error in createSkill: ${error.message}`);
		res.status(500).json({ success: false, error: error.message });
	}
};

// Update an existing skill
export const updateSkill = async (req, res) => {
	try {
		const { id } = req.params;
		const { name, description, parameters, code } = req.body;
		
		if (!name || !description || !code) {
			return res.status(400).json({ success: false, error: 'Name, description, and code are required.' });
		}

		if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
			return res.status(400).json({ success: false, error: 'Skill name must be a valid snake_case identifier.' });
		}

		const db = getDB();
		
		// Check for duplicate name if name changed
		const existingWithName = await db.collection('skills').findOne({ name, _id: { $ne: new ObjectId(id) } });
		if (existingWithName) {
			return res.status(400).json({ success: false, error: `Another skill with name "${name}" already exists.` });
		}

		const updateDoc = {
			$set: {
				name,
				description,
				parameters: parameters || { type: 'object', properties: {}, required: [] },
				code,
				updatedAt: new Date()
			}
		};

		const result = await db.collection('skills').updateOne({ _id: new ObjectId(id) }, updateDoc);
		if (result.matchedCount === 0) {
			return res.status(404).json({ success: false, error: 'Skill not found.' });
		}

		res.json({ success: true });
	} catch (error) {
		logger.error(`Error in updateSkill: ${error.message}`);
		res.status(500).json({ success: false, error: error.message });
	}
};

// Delete a skill
export const deleteSkill = async (req, res) => {
	try {
		const { id } = req.params;
		const db = getDB();
		const result = await db.collection('skills').deleteOne({ _id: new ObjectId(id) });
		
		if (result.deletedCount === 0) {
			return res.status(404).json({ success: false, error: 'Skill not found.' });
		}

		res.json({ success: true });
	} catch (error) {
		logger.error(`Error in deleteSkill: ${error.message}`);
		res.status(500).json({ success: false, error: error.message });
	}
};

// Test a skill
export const testSkill = async (req, res) => {
	try {
		const { code, args, name, parameters } = req.body;
		if (!code) {
			return res.status(400).json({ success: false, error: 'Code is required for testing.' });
		}

		const mockSkill = {
			name: name || 'test_skill',
			code,
			parameters: parameters || { type: 'object', properties: {} }
		};

		const startTime = Date.now();
		const result = await executeDynamicSkill(mockSkill, args || {});
		const latency = Date.now() - startTime;

		res.json({ success: true, result, latency });
	} catch (error) {
		logger.error(`Skill test execution failed: ${error.message}`);
		res.json({ success: false, error: error.message });
	}
};

// Generate a skill using the LLM based on a Mermaid chart and/or context
export const generateSkill = async (req, res) => {
	try {
		const { mermaidCode, chatHistory } = req.body;
		if (!mermaidCode && (!chatHistory || chatHistory.length === 0)) {
			return res.status(400).json({ success: false, error: 'Mermaid chart or chat history context is required.' });
		}

		// Construct message stack for the LLM
		const systemPrompt = `You are an expert software developer and system integrator.
Your task is to convert a Mermaid flowchart/diagram and/or a chat context history into a single, fully functional macOS or Node.js dynamic helper skill (tool).

You must return a raw JSON object ONLY, with no markdown code blocks or extra text. The JSON object must match this exact schema:
{
  "name": "string (snake_case, valid JS identifier, e.g. run_backup_process)",
  "description": "string (describes what the tool does, so a planning LLM knows when to call it)",
  "parameters": {
    "type": "object",
    "properties": {
      // properties schema in OpenAI/Ollama tool definition format
    },
    "required": ["list", "of", "required", "properties"]
  },
  "code": "string (executable JavaScript function. It must be an async function of the format: 'async (args, context) => { ... }' or 'async ({ prop1, prop2 }, context) => { ... }'. The context contains: { exec, execAsync, fs, path, logger, fetch }.)"
}

Guidelines for generating JS code:
1. Use 'context.execAsync' to run shell commands on macOS (e.g. 'await context.execAsync("open /Applications/Safari.app")').
2. Use 'context.fetch' to perform HTTP requests.
3. Use 'context.fs' and 'context.path' for files operations.
4. Use 'context.logger.info' or 'context.logger.error' for logging.
5. Make sure the code is completely standalone and evaluates successfully. Return the final output (string or object) as the result of the function.
6. Handle errors cleanly. If anything fails, throw a descriptive error.

The output must be a single, valid JSON object, and NOTHING else. Do not wrap the JSON object in markdown code block markers (e.g. do not use \`\`\`json). Just return the raw JSON text.`;

		const historyText = chatHistory && chatHistory.length > 0 
			? `Chat history context:\n${chatHistory.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n')}\n\n`
			: '';

		const chartText = mermaidCode 
			? `Mermaid chart describing the system/process logic to turn into a skill:
\`\`\`mermaid
${mermaidCode}
\`\`\``
			: '';

		const prompt = `${historyText}${chartText}`;

		const messages = [
			{ role: 'system', content: systemPrompt },
			{ role: 'user', content: prompt }
		];

		logger.info('Calling LLM to generate custom skill...');
		const response = await callLLM(messages, false);
		let generatedContent = response.message.content || '';

		// Safe cleaning of markdown code blocks
		if (generatedContent.includes('```')) {
			generatedContent = generatedContent.replace(/```json/gi, '').replace(/```/g, '').trim();
		}

		try {
			const skillData = JSON.parse(generatedContent);
			res.json({ success: true, skill: skillData });
		} catch (parseError) {
			logger.error(`Failed to parse generated skill JSON: ${parseError.message}`);
			logger.debug(`Raw generated content: ${generatedContent}`);
			res.status(500).json({ 
				success: false, 
				error: 'LLM generated invalid JSON structure. Please try again.',
				raw: generatedContent
			});
		}
	} catch (error) {
		logger.error(`Error generating skill: ${error.message}`);
		res.status(500).json({ success: false, error: error.message });
	}
};
