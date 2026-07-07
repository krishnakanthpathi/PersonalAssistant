import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { catchErrors } from '../../utils/errors.js';
import { logger } from '../../utils/logger.js';

const execAsync = promisify(exec);

export const screenshotTool = {
	definition: {
		name: 'take_screenshot',
		description: 'Captures a native screenshot of the macOS display and saves it to the local screenshots directory.',
		parameters: {
			type: 'object',
			properties: {}
		}
	},

	execute: catchErrors(async () => {
		const targetDir = path.resolve('data/screenshots');
		if (!fs.existsSync(targetDir)) {
			fs.mkdirSync(targetDir, { recursive: true });
		}

		const fileName = `screenshot_${Date.now()}.png`;
		const filePath = path.join(targetDir, fileName);

		logger.info(`Taking screenshot and saving to: ${filePath}`);
		// Run macOS native screencapture. The -x flag silences the camera shutter sound.
		const command = `screencapture -x "${filePath}"`;
		await execAsync(command);

		return `Screenshot captured successfully and saved to data/screenshots/${fileName}`;
	}, 'Failed to take screenshot')
};
