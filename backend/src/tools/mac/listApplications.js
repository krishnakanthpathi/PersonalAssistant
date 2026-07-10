import fs from 'fs';
import { catchErrors } from '../../utils/errors.js';

export const listApplicationsTool = {
	definition: {
		name: 'list_applications',
		description: 'Lists all GUI applications currently installed on macOS.',
		parameters: {
			type: 'object',
			properties: {}
		}
	},

	execute: catchErrors(async () => {
		const apps = new Set();
		const dirs = ['/Applications', '/System/Applications', `${process.env.HOME}/Applications`];
		
		for (const dir of dirs) {
			if (fs.existsSync(dir)) {
				try {
					const files = fs.readdirSync(dir);
					for (const file of files) {
						if (file.endsWith('.app')) {
							apps.add(file.replace('.app', ''));
						}
					}
				} catch (e) {
					// Ignore read errors
				}
			}
		}

		const appList = Array.from(apps).sort();
		if (appList.length === 0) {
			return 'No installed applications found.';
		}

		return `Installed Applications:\n${appList.map(app => `- ${app}`).join('\n')}`;
	}, 'Failed to list installed applications')
};
