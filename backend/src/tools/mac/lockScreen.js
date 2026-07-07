import { exec } from 'child_process';
import { promisify } from 'util';
import { catchErrors } from '../../utils/errors.js';
import { logger } from '../../utils/logger.js';

const execAsync = promisify(exec);

export const lockScreenTool = {
	definition: {
		name: 'lock_screen',
		description: 'Locks the macOS screen immediately.',
		parameters: {
			type: 'object',
			properties: {}
		}
	},

	execute: catchErrors(async () => {
		logger.info('Locking macOS screen...');
		await execAsync('pmset displaysleepnow');
		return 'Screen locked successfully.';
	}, 'Failed to lock screen')
};
