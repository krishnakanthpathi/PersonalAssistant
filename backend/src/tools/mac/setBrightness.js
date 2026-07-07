import { exec } from 'child_process';
import { promisify } from 'util';
import { catchErrors } from '../../utils/errors.js';
import { logger } from '../../utils/logger.js';

const execAsync = promisify(exec);

export const setBrightnessTool = {
	definition: {
		name: 'set_brightness',
		description: 'Sets the display brightness level (0 to 100) on macOS.',
		parameters: {
			type: 'object',
			properties: {
				level: {
					type: 'integer',
					description: 'The brightness level percentage to set (0 to 100).'
				}
			},
			required: ['level']
		}
	},

	execute: catchErrors(async ({ level }) => {
		if (level === undefined || level < 0 || level > 100) {
			throw new Error('Brightness level must be an integer between 0 and 100');
		}
		
		logger.info(`Setting screen brightness to: ${level}%`);
		const targetLevel = level / 100;
		const command = `osascript -e 'tell application "System Events" to set brightness of first display to ${targetLevel}'`;
		await execAsync(command);
		return `Display brightness set to ${level}%.`;
	}, 'Failed to set display brightness')
};
