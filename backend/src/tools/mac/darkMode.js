import { exec } from 'child_process';
import { promisify } from 'util';
import { catchErrors } from '../../utils/errors.js';
import { logger } from '../../utils/logger.js';

const execAsync = promisify(exec);

export const darkModeTool = {
	definition: {
		name: 'set_dark_mode',
		description: 'Sets or toggles macOS dark mode appearance settings.',
		parameters: {
			type: 'object',
			properties: {
				enable: {
					type: 'boolean',
					description: 'True to enable dark mode, false to enable light mode. Omit parameter to toggle current state.'
				}
			}
		}
	},

	execute: catchErrors(async ({ enable }) => {
		logger.info(`Setting macOS dark mode appearance. Enable: ${enable}`);
		let script = '';
		if (enable === undefined) {
			script = 'tell application "System Events" to tell appearance preferences to set dark mode to not dark mode';
		} else {
			script = `tell application "System Events" to tell appearance preferences to set dark mode to ${enable}`;
		}
		
		await execAsync(`osascript -e '${script}'`);
		return `System appearance updated successfully.`;
	}, 'Failed to set appearance mode')
};
