import { exec } from 'child_process';
import { promisify } from 'util';
import { catchErrors } from '../../utils/errors.js';
import { logger } from '../../utils/logger.js';

const execAsync = promisify(exec);

export const agentDesktopTool = {
	definition: {
		name: 'agent_desktop_action',
		description: 'Allows complete GUI control, desktop automation, and process monitoring. Can list running applications, get UI window snapshots, click any element or button on the screen, type messages, send keyboard hotkeys, and perform desktop actions.',
		parameters: {
			type: 'object',
			properties: {
				action: {
					type: 'string',
					enum: ['apps', 'snapshot', 'click', 'type', 'press', 'screenshot', 'launch', 'close-app', 'status'],
					description: 'The action to perform.'
				},
				app: {
					type: 'string',
					description: 'The name of the target application (required for snapshot/screenshot/launch/close-app).'
				},
				ref: {
					type: 'string',
					description: 'The target element reference string (e.g. "@e12", "@e5") for click/type actions.'
				},
				text: {
					type: 'string',
					description: 'The text to type into the input field.'
				},
				keyCombo: {
					type: 'string',
					description: 'The key combination to press (e.g. "enter", "cmd+return").'
				}
			},
			required: ['action']
		}
	},

	execute: catchErrors(async ({ action, app, ref, text, keyCombo }) => {
		let cmdArgs = [];
		if (action === 'apps') {
			cmdArgs = ['list-apps'];
		} else if (action === 'snapshot') {
			if (!app) throw new Error('App name is required for snapshot');
			cmdArgs = ['snapshot', '--app', `"${app}"`, '-i', '--compact'];
		} else if (action === 'click') {
			if (!ref) throw new Error('Element reference is required for click');
			cmdArgs = ['click', ref];
		} else if (action === 'type') {
			if (!ref || !text) throw new Error('Element reference and text are required for type');
			cmdArgs = ['type', ref, `"${text.replace(/"/g, '\\"')}"`];
		} else if (action === 'press') {
			if (!keyCombo) throw new Error('Key combination is required for press');
			cmdArgs = ['press', keyCombo];
		} else if (action === 'screenshot') {
			if (!app) throw new Error('App name is required for screenshot');
			const outputPath = `./data/screenshot_${Date.now()}.png`;
			cmdArgs = ['screenshot', '--app', `"${app}"`, '--output', outputPath];
		} else if (action === 'launch') {
			if (!app) throw new Error('App name is required for launch');
			cmdArgs = ['launch', `"${app}"`];
		} else if (action === 'close-app') {
			if (!app) throw new Error('App name is required for close-app');
			cmdArgs = ['close-app', `"${app}"`];
		} else if (action === 'status') {
			cmdArgs = ['status'];
		}



		// Run using npx to guarantee availability without manual global installation
		const command = `npx --yes agent-desktop ${cmdArgs.join(' ')}`;
		logger.info(`Running agent-desktop command: ${command}`);

		try {
			const { stdout, stderr } = await execAsync(command);
			if (stderr && stderr.trim().toLowerCase().includes('error') && !stdout) {
				throw new Error(stderr);
			}
			return stdout || `Action "${action}" completed successfully.`;
		} catch (error) {
			logger.error(`agent-desktop execution failed: ${error.message}`);
			// Provide helpful permission error details if applicable on macOS
			if (error.message.includes('permission') || error.message.includes('Accessibility')) {
				return `Error: Accessibility or Screen Recording permissions are required for agent-desktop. Please enable them in macOS System Settings -> Privacy & Security.`;
			}
			throw error;
		}
	}, 'Failed to execute agent-desktop action')
};
