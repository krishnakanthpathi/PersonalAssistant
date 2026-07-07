import { exec } from 'child_process';
import { promisify } from 'util';
import { catchErrors } from '../../utils/errors.js';
import { logger } from '../../utils/logger.js';

const execAsync = promisify(exec);

export const clipboardTool = {
	definition: {
		name: 'clipboard_action',
		description: 'Gets or sets the system clipboard text on macOS.',
		parameters: {
			type: 'object',
			properties: {
				action: {
					type: 'string',
					enum: ['get', 'set'],
					description: 'Whether to get the current clipboard text or set it.'
				},
				text: {
					type: 'string',
					description: 'The text to copy to clipboard (required if action is "set").'
				}
			},
			required: ['action']
		}
	},

	execute: catchErrors(async ({ action, text }) => {
		if (action === 'get') {
			logger.info('Getting clipboard content...');
			const { stdout } = await execAsync('pbpaste');
			return stdout || 'Clipboard is empty.';
		} else if (action === 'set') {
			if (text === undefined) throw new Error('Text parameter is required to set clipboard');
			logger.info(`Setting clipboard content to: "${text.substring(0, 50)}..."`);
			const child = exec('pbcopy');
			child.stdin.write(text);
			child.stdin.end();
			return 'Text copied to clipboard successfully.';
		}
	}, 'Failed to execute clipboard action')
};
