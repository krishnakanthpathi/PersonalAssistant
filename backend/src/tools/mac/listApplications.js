import fs from 'fs';
import { platform } from 'os';
import { catchErrors } from '../../utils/errors.js';

export const listApplicationsTool = {
	definition: {
		name: 'list_applications',
		description: 'Lists all GUI applications currently installed in the operating system.',
		parameters: {
			type: 'object',
			properties: {}
		}
	},

	execute: catchErrors(async () => {
		const currentPlatform = platform();
		const apps = new Set();

		if (currentPlatform === 'darwin') {
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
		} else if (currentPlatform === 'win32') {
			const winDirs = [
				'C:\\Program Files',
				'C:\\Program Files (x86)',
				`${process.env.USERPROFILE}\\AppData\\Local\\Programs`
			];
			for (const dir of winDirs) {
				if (fs.existsSync(dir)) {
					try {
						const files = fs.readdirSync(dir);
						for (const file of files) {
							if (!file.startsWith('$') && !file.includes('Uninstall') && file.length > 2) {
								apps.add(file);
							}
						}
					} catch (e) {
						// Ignore read errors
					}
				}
			}
		} else {
			// Linux/other
			const linuxDirs = ['/usr/share/applications', '/var/lib/flatpak/exports/share/applications'];
			for (const dir of linuxDirs) {
				if (fs.existsSync(dir)) {
					try {
						const files = fs.readdirSync(dir);
						for (const file of files) {
							if (file.endsWith('.desktop')) {
								apps.add(file.replace('.desktop', ''));
							}
						}
					} catch (e) {
						// Ignore read errors
					}
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
