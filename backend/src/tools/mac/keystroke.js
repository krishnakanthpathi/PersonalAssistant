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
					enum: ['type', 'shortcut'],
					description: 'Whether to type plain text characters ("type") or send a keyboard key/shortcut combo ("shortcut").'
				},
				text: {
					type: 'string',
					description: 'The text string to type (required for action: "type").'
				},
				key: {
					type: 'string',
					description: 'The target key to press (e.g. "enter", "escape", "space", "a", "c", etc. Required for action: "shortcut").'
				},
				modifiers: {
					type: 'array',
					items: {
						type: 'string',
						enum: ['command', 'option', 'control', 'shift']
					},
					description: 'Optional modifier keys to hold down during the shortcut (e.g., ["command"] for Cmd + Key).'
				}
			},
			required: ['action']
		}
	},

	execute: catchErrors(async ({ action, text, key, modifiers = [] }) => {
		if (action === 'type') {
			if (!text) throw new Error('Text parameter is required for typing action');
			logger.info(`Typing text via keystroke: "${text}"`);
			// Sanitize double quotes and backslashes for AppleScript
			const escaped = text.replace(/["\\]/g, '\\$&');
			const command = `osascript -e 'tell application "System Events" to keystroke "${escaped}"'`;
			await execAsync(command);
			return `Typed text "${text}" successfully.`;
		} else if (action === 'shortcut') {
			if (!key) throw new Error('Key parameter is required for shortcut action');
			const lowerKey = key.toLowerCase();
			logger.info(`Sending keyboard shortcut: ${modifiers.join('+') + (modifiers.length ? '+' : '')}${key}`);

			// Build AppleScript instruction
			let actionScript = '';
			if (KEY_CODES[lowerKey]) {
				actionScript = `key code ${KEY_CODES[lowerKey]}`;
			} else {
				actionScript = `keystroke "${lowerKey.substring(0, 1)}"`;
			}

			// Add modifiers if provided
			if (modifiers && modifiers.length > 0) {
				const applescriptMods = modifiers
					.map(m => MODIFIER_MAP[m.toLowerCase()])
					.filter(Boolean);
				if (applescriptMods.length > 0) {
					actionScript += ` using {${applescriptMods.join(', ')}}`;
				}
			}

			const command = `osascript -e 'tell application "System Events" to ${actionScript}'`;
			await execAsync(command);
			return `Shortcut action completed successfully.`;
		}
	}, 'Failed to execute keystroke action')
};
