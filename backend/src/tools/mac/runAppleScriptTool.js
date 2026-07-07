import { runAppleScript } from '../../utils/appleScript.js';
import { catchErrors } from '../../utils/errors.js';
import { logger } from '../../utils/logger.js';

export const runAppleScriptTool = {
	definition: {
		name: 'run_applescript',
		description: 'Executes a custom raw AppleScript (osascript) on macOS. Use this for advanced scripting, UI automation, window management, simulating mouse clicks, keystrokes, running custom commands, or any system automation not supported by other tools. Highly retrievable for custom AppleScript execution tasks.',
		parameters: {
			type: 'object',
			properties: {
				script: {
					type: 'string',
					description: 'The raw AppleScript code to execute (e.g., "tell application \\"Finder\\" to get name of front window").'
				}
			},
			required: ['script']
		}
	},

	execute: catchErrors(async ({ script }) => {
		if (!script) throw new Error('Script parameter is required');
		logger.info(`Executing raw AppleScript:\n${script}`);
		
		const result = await runAppleScript(script);
		return result || 'Script executed successfully with no return value.';
	}, 'Failed to execute raw AppleScript')
};
