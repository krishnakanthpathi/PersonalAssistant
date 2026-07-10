import { exec } from 'child_process';
import { promisify } from 'util';
import { catchErrors } from '../../utils/errors.js';
import { logger } from '../../utils/logger.js';

const execAsync = promisify(exec);

// Key code mapping for common keys on macOS
const KEY_CODES = {
	'enter': '36',
	'return': '36',
	'tab': '48',
	'space': '49',
	'escape': '53',
	'delete': '51',
	'backspace': '51',
	'up': '126',
	'down': '125',
	'left': '123',
	'right': '124'
};

// Modifiers mapping for AppleScript syntax
const MODIFIER_MAP = {
	'command': 'command down',
	'cmd': 'command down',
	'option': 'option down',
	'alt': 'option down',
	'control': 'control down',
	'ctrl': 'control down',
	'shift': 'shift down'
};

export const keystrokeTool = {
	definition: {
		name: 'keystroke_action',
		description: 'Simulates typing text or pressing specific keyboard shortcut keys on macOS using native events.',
		parameters: {
			type: 'object',
			properties: {
				action: {
					type: 'string',
					enum: ['type', 'shortcut', 'press'],
					description: 'Whether to type plain text characters ("type"), or press a specific key/shortcut ("shortcut" or "press").'
				},
				text: {
					type: 'string',
					description: 'The text string to type (required for action: "type").'
				},
				key: {
					type: 'string',
					description: 'The target key to press (e.g. "enter", "escape", "space", "c". Required for action: "shortcut").'
				},
				modifiers: {
					type: 'array',
					items: {
						type: 'string',
						enum: ['command', 'option', 'control', 'shift']
					},
					description: 'Optional modifier keys to hold down during the shortcut.'
				}
			},
			required: ['action']
		}
	},

	execute: catchErrors(async ({ action, text, key, modifiers = [] }) => {
		if (action === 'type') {
			if (!text) throw new Error('Text parameter is required for typing action');
			logger.info(`Typing text via clipboard paste: "${text.substring(0, 30)}..."`);
			
			// Restore clipboard later to keep system clipboard intact
			let originalClipboard = '';
			try {
				const { stdout } = await execAsync('pbpaste');
				originalClipboard = stdout;
			} catch (err) {
				logger.warn('Failed to read current clipboard:', err.message);
			}

			// Write target text to clipboard
			const cpProcess = exec('pbcopy');
			cpProcess.stdin.write(text);
			cpProcess.stdin.end();
			await new Promise(r => setTimeout(r, 50));

			// Paste instantly via Cmd+V
			await execAsync(`osascript -e 'tell application "System Events" to keystroke "v" using command down'`);
			await new Promise(r => setTimeout(r, 100));

			// Restore clipboard
			if (originalClipboard) {
				const restoreProcess = exec('pbcopy');
				restoreProcess.stdin.write(originalClipboard);
				restoreProcess.stdin.end();
			}

			return `Typed text successfully.`;
		} else if (action === 'shortcut' || action === 'press') {
			if (!key) throw new Error('Key parameter is required for shortcut/press action');
			const lowerKey = key.toLowerCase();
			logger.info(`Sending keyboard shortcut: ${modifiers.join('+') + (modifiers.length ? '+' : '')}${key}`);

			let actionScript = KEY_CODES[lowerKey] 
				? `key code ${KEY_CODES[lowerKey]}` 
				: `keystroke "${lowerKey.substring(0, 1)}"`;

			if (modifiers && modifiers.length > 0) {
				const applescriptMods = modifiers
					.map(m => MODIFIER_MAP[m.toLowerCase()])
					.filter(Boolean);
				if (applescriptMods.length > 0) {
					actionScript += ` using {${applescriptMods.join(', ')}}`;
				}
			}

			await execAsync(`osascript -e 'tell application "System Events" to ${actionScript}'`);
			return `Shortcut action completed successfully.`;
		} else {
			throw new Error(`Unknown action "${action}".`);
		}
	}, 'Failed to execute keystroke action')
};
