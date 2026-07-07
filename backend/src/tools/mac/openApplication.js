import { exec } from 'child_process';
import { promisify } from 'util';
import { catchErrors } from '../../utils/errors.js';
import { logger } from '../../utils/logger.js';

const execAsync = promisify(exec);

export const openApplicationTool = {
	definition: {
		name: 'open_application',
		description: 'Launches or brings to focus a GUI application installed on macOS (e.g. Safari, Google Chrome, Finder, Notes).',
		parameters: {
			type: 'object',
			properties: {
				app: {
					type: 'string',
					description: 'The name of the application to open (e.g. "Safari", "Google Chrome", "Finder", "Notes").'
				}
			},
			required: ['app']
		}
	},

	execute: catchErrors(async ({ app }) => {
		if (!app) throw new Error('App name is required');
		
		logger.info(`Opening application: ${app}`);
		const command = `open -a "${app.replace(/"/g, '\\"')}"`;
		await execAsync(command);
		return `Application "${app}" opened successfully.`;
	}, 'Failed to open application')
};
