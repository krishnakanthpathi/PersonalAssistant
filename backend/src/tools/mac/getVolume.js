import { exec } from 'child_process';
import { promisify } from 'util';
import { catchErrors } from '../../utils/errors.js';
import { logger } from '../../utils/logger.js';

const execAsync = promisify(exec);

export const getVolumeTool = {
	definition: {
		name: 'get_volume',
		description: 'Gets the current system output volume level (0-100) on macOS.',
		parameters: {
			type: 'object',
			properties: {}
		}
	},

	execute: catchErrors(async () => {
		logger.info('Getting output volume...');
		const { stdout } = await execAsync(`osascript -e "output volume of (get volume settings)"`);
		const volume = parseInt(stdout.trim(), 10);
		return `System output volume is currently at ${volume}%.`;
	}, 'Failed to get output volume')
};
