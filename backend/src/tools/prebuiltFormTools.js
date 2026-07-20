import { getDB } from '../config/mongodb.js';
import { catchErrors } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

export const createPrebuiltFormTool = {
	definition: {
		name: 'create_prebuilt_form',
		description: 'Dynamically pre-builds/creates an action card or form template with specific user inputs and a predefined execution prompt. This form will appear in the UI for the user to execute.',
		parameters: {
			type: 'object',
			properties: {
				title: { 
					type: 'string', 
					description: 'The title of the predefined action card.' 
				},
				description: { 
					type: 'string', 
					description: 'A short explanation of what the predefined card does.' 
				},
				prompt: { 
					type: 'string', 
					description: 'The prompt text that will be executed, with placeholders like {{input_name}} for form fields.' 
				},
				inputs: {
					type: 'array',
					items: {
						type: 'object',
						properties: {
							name: { type: 'string', description: 'The variable name of the input parameter, matches placeholders in prompt.' },
							label: { type: 'string', description: 'The user-friendly label for this input field.' },
							type: { type: 'string', description: 'The HTML input type, e.g. "text", "number", "password".', default: 'text' },
							defaultValue: { type: 'string', description: 'The default value for the input field.' }
						},
						required: ['name', 'label']
					},
					description: 'List of inputs/fields the user needs to fill in before running the card.'
				}
			},
			required: ['title', 'description', 'prompt']
		}
	},
	execute: catchErrors(async ({ title, description, prompt, inputs = [] }) => {
		logger.info(`LLM executing create_prebuilt_form for: ${title}`);
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
		return `Prebuilt form "${title}" created successfully with ID ${result.insertedId}. It is now available to the user in the UI.`;
	})
};
