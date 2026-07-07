import { exec } from 'child_process';
import { promisify } from 'util';
import { catchErrors } from '../../utils/errors.js';
import { logger } from '../../utils/logger.js';

const execAsync = promisify(exec);

export const wifiControlTool = {
	definition: {
		name: 'wifi_control',
		description: 'Controls or checks status of macOS Wi-Fi connection.',
		parameters: {
			type: 'object',
			properties: {
				action: {
					type: 'string',
					enum: ['status', 'on', 'off'],
					description: 'Check status, turn Wi-Fi on, or turn Wi-Fi off.'
				}
			},
			required: ['action']
		}
	},

	execute: catchErrors(async ({ action }) => {
		logger.info(`Wi-Fi action: ${action}`);
		
		// Find Wi-Fi interface (usually en0)
		let interfaceName = 'en0';
		try {
			const { stdout } = await execAsync('networksetup -listallhardwareports');
			const match = stdout.match(/Hardware Port: Wi-Fi\nDevice: (\w+)/);
			if (match) {
				interfaceName = match[1];
			}
		} catch (err) {
			logger.warn(`Could not determine Wi-Fi interface name, defaulting to en0. Error: ${err.message}`);
		}

		if (action === 'status') {
			const { stdout } = await execAsync(`networksetup -getairportnetwork ${interfaceName}`);
			return stdout.trim();
		} else if (action === 'on') {
			await execAsync(`networksetup -setairportpower ${interfaceName} on`);
			return 'Wi-Fi turned on successfully.';
		} else if (action === 'off') {
			await execAsync(`networksetup -setairportpower ${interfaceName} off`);
			return 'Wi-Fi turned off successfully.';
		}
	}, 'Failed to execute Wi-Fi action')
};
