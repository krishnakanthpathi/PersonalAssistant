import { exec } from 'child_process';
import { promisify } from 'util';
import { catchErrors } from '../../utils/errors.js';
import { logger } from '../../utils/logger.js';

const execAsync = promisify(exec);

export const emptyTrashTool = {
	definition: {
		name: 'empty_trash',
		description: 'Empties the macOS Trash folder.',
		parameters: {
			type: 'object',
			properties: {}
		}
	},

	execute: catchErrors(async () => {
		logger.info('Emptying Trash');
		const command = `osascript -e 'tell application "Finder" to empty trash'`;
		await execAsync(command);
		return 'Trash folder emptied successfully.';
	}, 'Failed to empty Trash')
};
