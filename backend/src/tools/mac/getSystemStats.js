import { exec } from 'child_process';
import { promisify } from 'util';
import { catchErrors } from '../../utils/errors.js';
import { logger } from '../../utils/logger.js';

const execAsync = promisify(exec);

export const getSystemStatsTool = {
	definition: {
		name: 'get_system_stats',
		description: 'Retrieves current macOS system statistics (battery, disk space, and simple CPU/memory status).',
		parameters: {
			type: 'object',
			properties: {}
		}
	},

	execute: catchErrors(async () => {
		logger.info('Fetching system statistics...');
		
		let battery = 'Unknown';
		try {
			const { stdout } = await execAsync('pmset -g batt');
			battery = stdout.trim();
		} catch (err) {
			battery = 'Unavailable (possibly a desktop Mac)';
		}

		let disk = 'Unknown';
		try {
			const { stdout } = await execAsync('df -lh /');
			const lines = stdout.trim().split('\n');
			if (lines.length > 1) {
				disk = lines[1]; // Get root mount metrics
			}
		} catch (err) {
			disk = 'Unavailable';
		}

		return `System Statistics:\n- Battery status: ${battery}\n- Disk status (Root /): ${disk}`;
	}, 'Failed to retrieve system statistics')
};
