import { exec } from 'child_process';
import { promisify } from 'util';
import { catchErrors } from '../../utils/errors.js';
import { logger } from '../../utils/logger.js';

const execAsync = promisify(exec);

export const openUrlTool = {
	definition: {
		name: 'open_url',
		description: 'Opens a web URL in the default web browser (Safari/Google Chrome) on macOS.',
		parameters: {
			type: 'object',
			properties: {
				url: {
					type: 'string',
					description: 'The web address / URL to open (e.g. "https://www.google.com").'
				}
			},
			required: ['url']
		}
	},

	execute: catchErrors(async ({ url }) => {
		if (!url) throw new Error('URL is required');
		logger.info(`Opening URL: ${url}`);
		const command = `open "${url.replace(/"/g, '\\"')}"`;
		await execAsync(command);
		return `URL "${url}" opened successfully.`;
	}, 'Failed to open URL')
};
