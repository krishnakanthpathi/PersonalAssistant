import { exec } from 'child_process';
import { promisify } from 'util';
import { catchErrors } from '../../utils/errors.js';
import { logger } from '../../utils/logger.js';

const execAsync = promisify(exec);

export const mediaControlTool = {
	definition: {
		name: 'media_control',
		description: 'Controls playing media tracks (Music/Spotify) on macOS.',
		parameters: {
			type: 'object',
			properties: {
				action: {
					type: 'string',
					enum: ['play', 'pause', 'playpause', 'next', 'previous'],
					description: 'The media control action to perform.'
				},
				player: {
					type: 'string',
					enum: ['Music', 'Spotify'],
					description: 'Which app to target (defaults to Music).'
				}
			},
			required: ['action']
		}
	},

	execute: catchErrors(async ({ action, player = 'Music' }) => {
		logger.info(`Sending media action "${action}" to player "${player}"`);
		const command = `osascript -e 'tell application "${player}" to ${action}'`;
		await execAsync(command);
		return `Media action "${action}" sent to "${player}" successfully.`;
	}, 'Failed to execute media control action')
};
