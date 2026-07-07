import { exec } from 'child_process';
import { promisify } from 'util';
import { catchErrors } from '../../utils/errors.js';
import { logger } from '../../utils/logger.js';

const execAsync = promisify(exec);

export const closeApplicationTool = {
	definition: {
		name: 'close_application',
		description: 'Closes a GUI application running on macOS gracefully (e.g. Safari, Google Chrome, Finder, Notes).',
		parameters: {
			type: 'object',
			properties: {
				app: {
					type: 'string',
					description: 'The name of the application to quit (e.g. "Safari", "Google Chrome", "Notes").'
				}
			},
			required: ['app']
		}
	},

	execute: catchErrors(async ({ app }) => {
		if (!app) throw new Error('App name is required');
		logger.info(`Closing application: ${app}`);
		const command = `osascript -e 'quit application "${app.replace(/"/g, '\\"')}"'`;
		await execAsync(command);
		return `Application "${app}" closed successfully.`;
	}, 'Failed to close application')
};
