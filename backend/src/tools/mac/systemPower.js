import { exec } from 'child_process';
import { promisify } from 'util';
import { catchErrors } from '../../utils/errors.js';
import { logger } from '../../utils/logger.js';

const execAsync = promisify(exec);

export const systemPowerTool = {
	definition: {
		name: 'system_power',
		description: 'Puts the Mac to sleep, restarts it, or shuts it down natively.',
		parameters: {
			type: 'object',
			properties: {
				action: {
					type: 'string',
					enum: ['sleep', 'restart', 'shutdown'],
					description: 'The power action to execute.'
				}
			},
			required: ['action']
		}
	},

	execute: catchErrors(async ({ action }) => {
		logger.info(`Executing system power action: ${action}`);
		let script = '';
		if (action === 'sleep') {
			script = 'tell application "Finder" to sleep';
		} else if (action === 'restart') {
			script = 'tell application "Finder" to restart';
		} else if (action === 'shutdown') {
			script = 'tell application "Finder" to shut down';
		}
		
		await execAsync(`osascript -e '${script}'`);
		return `System power action "${action}" sent successfully.`;
	}, 'Failed to execute system power action')
};
