import { exec } from 'child_process';
import { promisify } from 'util';
import { catchErrors } from '../../utils/errors.js';
import { logger } from '../../utils/logger.js';
import { copyImageToClipboard } from '../../utils/appleScript.js';

const execAsync = promisify(exec);

export const clipboardTool = {
	definition: {
		name: 'clipboard_action',
		description: 'Gets or sets the system clipboard on macOS. Supports text (get/set) and copying an image file to clipboard (copy_image).',
		parameters: {
			type: 'object',
			properties: {
				action: {
					type: 'string',
					enum: ['get', 'set', 'copy_image'],
					description: '"get" = read clipboard text, "set" = write text to clipboard, "copy_image" = copy an image file to clipboard by path.'
				},
				text: {
					type: 'string',
					description: 'The text to copy to clipboard (required if action is "set").'
				},
				filePath: {
					type: 'string',
					description: 'Absolute path to the image file (required if action is "copy_image").'
				}
			},
			required: ['action']
		}
	},

	execute: catchErrors(async ({ action, text, filePath }) => {
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
		} else if (action === 'copy_image') {
			if (!filePath) throw new Error('filePath parameter is required to copy an image to clipboard');
			logger.info(`Copying image to clipboard: ${filePath}`);
			await copyImageToClipboard(filePath);
			return `Image copied to clipboard from ${filePath}`;
		}
	}, 'Failed to execute clipboard action')
};
