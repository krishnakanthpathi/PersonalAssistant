import { exec } from 'child_process';
import { promisify } from 'util';
import { catchErrors } from '../../utils/errors.js';
import { logger } from '../../utils/logger.js';

const execAsync = promisify(exec);

export const mouseClickTool = {
	definition: {
		name: 'mouse_click',
		description: 'Simulates a native mouse click at a specific screen coordinate (x, y) on macOS using System Events. Use this to click buttons, links, menu items, icons, or any screen element after obtaining its coordinates from get_ui_elements or annotate_screen. Supports single click, double click, and right click. Essential for desktop GUI automation: clicking the Send button, selecting a contact, pressing OK/Cancel, clicking toolbar icons, interacting with any on-screen element by coordinate.',
		parameters: {
			type: 'object',
			properties: {
				x: {
					type: 'number',
					description: 'The horizontal screen coordinate to click (pixels from left edge).'
				},
				y: {
					type: 'number',
					description: 'The vertical screen coordinate to click (pixels from top edge).'
				},
				action: {
					type: 'string',
					enum: ['click', 'double_click', 'right_click'],
					description: 'Type of click action. Default is "click" (single left click).'
				}
			},
			required: ['x', 'y']
		}
	},

	execute: catchErrors(async ({ x, y, action = 'click' }) => {
		if (typeof x !== 'number' || typeof y !== 'number') {
			throw new Error('x and y must be numeric screen coordinates');
		}

		const ix = Math.round(x);
		const iy = Math.round(y);
		logger.info(`Performing ${action} at screen position (${ix}, ${iy})`);

		let script;
		if (action === 'double_click') {
			script = `
tell application "System Events"
	click at {${ix}, ${iy}}
	delay 0.05
	click at {${ix}, ${iy}}
end tell`.trim();
		} else if (action === 'right_click') {
			// AppleScript doesn't support right-click natively; use cliclick if available,
			// fallback to an alternate AppleScript approach
			try {
				await execAsync(`which cliclick`);
				await execAsync(`cliclick rc:${ix},${iy}`);
				return `Right-clicked at (${ix}, ${iy}) successfully.`;
			} catch {
				// cliclick not available — use control+click via System Events
				script = `
tell application "System Events"
	key down control
	click at {${ix}, ${iy}}
	key up control
end tell`.trim();
			}
		} else {
			script = `
tell application "System Events"
	click at {${ix}, ${iy}}
end tell`.trim();
		}

		await execAsync(`osascript << 'APPLESCRIPT'\n${script}\nAPPLESCRIPT`);
		// Small delay after click so the UI can settle before the next action
		await new Promise(r => setTimeout(r, 150));

		return `${action.replace('_', ' ')} performed at screen position (${ix}, ${iy}) successfully.`;
	}, 'Failed to perform mouse click')
};
