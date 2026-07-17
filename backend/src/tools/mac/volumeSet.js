import { exec } from 'child_process';
import { promisify } from 'util';
import { catchErrors } from '../../utils/errors.js';

const execAsync = promisify(exec);

export const volumeSetTool = {
	definition: {
		name: 'volume_set',
		description: 'Sets the macOS system volume to an exact percentage level.',
		// We change "input_schema" to "parameters" to strictly match 
		// Ollama and OpenAI's native tool-calling specifications
		parameters: {
			type: 'object',
			properties: {
				level: {
					type: 'number',
					description: 'The target volume percentage level from 0 to 100.'
				}
			},
			required: ['level']
		}
	},

	execute: catchErrors(async ({ level }) => {
		const parsed = Number(level);
		if (isNaN(parsed)) {
			throw new Error('Level is not a valid number');
		}
		// 1. Sanitize the input to ensure it is a safe integer between 0-100
		const safeLevel = Math.max(
			0, Math.min(100, Math.round(parsed))
		);

		// 2. Execute the exact volume AppleScript
		await execAsync(
			`osascript -e 'set volume output volume ${safeLevel}'`
		);

		return `Successfully set the system volume to ${safeLevel}%.`;
	}, 'Failed to set system volume')
};