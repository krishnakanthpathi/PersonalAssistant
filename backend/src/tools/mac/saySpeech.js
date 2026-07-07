import { exec } from 'child_process';
import { promisify } from 'util';
import { catchErrors } from '../../utils/errors.js';
import { logger } from '../../utils/logger.js';

const execAsync = promisify(exec);

export const saySpeechTool = {
	definition: {
		name: 'say_speech',
		description: 'Speaks the input text aloud using the macOS native speech synthesizer.',
		parameters: {
			type: 'object',
			properties: {
				text: {
					type: 'string',
					description: 'The text message for the computer to speak aloud.'
				}
			},
			required: ['text']
		}
	},

	execute: catchErrors(async ({ text }) => {
		if (!text) throw new Error('Text parameter is required');
		logger.info(`Speaking text: "${text}"`);
		
		// Sanitize text for shell
		const sanitizedText = text.replace(/["\\]/g, '\\$&');
		await execAsync(`say "${sanitizedText}"`);
		return `Successfully spoke text aloud.`;
	}, 'Failed to speak text')
};
