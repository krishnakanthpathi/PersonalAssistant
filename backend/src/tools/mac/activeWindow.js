import { runAppleScript } from '../../utils/appleScript.js';
import { catchErrors } from '../../utils/errors.js';
import { logger } from '../../utils/logger.js';

export const activeWindowTool = {
	definition: {
		name: 'get_active_window',
		description: 'Gets the application name of the current active focused frontmost window on macOS.',
		parameters: {
			type: 'object',
			properties: {}
		}
	},

	execute: catchErrors(async () => {
		logger.info('Fetching current active window app name...');
		const script = 'tell application "System Events" to get name of first process whose frontmost is true';
		const appName = await runAppleScript(script);
		return `Current active application: ${appName}`;
	}, 'Failed to get active window')
};
