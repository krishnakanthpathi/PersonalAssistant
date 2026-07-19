import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { catchErrors } from '../../utils/errors.js';
import { logger } from '../../utils/logger.js';

const execAsync = promisify(exec);

/**
 * Finds the window ID of the iPhone Mirroring app using the CGWindowList API via Swift.
 * Returns the window ID as a string, or null if not found.
 */
async function findIPhoneMirrorWindowId() {
	const swiftCode = `
		import Cocoa
		let options = CGWindowListOption(arrayLiteral: .excludeDesktopElements, .optionOnScreenOnly)
		guard let list = CGWindowListCopyWindowInfo(options, kCGNullWindowID) as? [[String: Any]] else {
			exit(1)
		}
		for w in list {
			let owner = w[kCGWindowOwnerName as String] as? String ?? ""
			let winId = w[kCGWindowNumber as String] as? Int32 ?? 0
			if owner.lowercased().contains("iphone mirroring") {
				print(winId)
				exit(0)
			}
		}
		exit(1)
	`;

	return new Promise((resolve) => {
		const child = exec('swift -');
		let out = '';
		child.stdout.on('data', d => out += d);
		child.stdin.write(swiftCode);
		child.stdin.end();
		child.on('close', code => {
			resolve(code === 0 ? out.trim() : null);
		});
	});
}

export const screenshotTool = {
	definition: {
		name: 'take_screenshot',
		description: 'Capture a screenshot of the full screen, a specific window, or the iPhone Mirroring window. The image is saved to disk and the file path is returned. Use clipboard_action with action "copy_image" to copy it to clipboard if needed.',
		parameters: {
			type: 'object',
			properties: {
				target: {
					type: 'string',
					enum: ['screen', 'window', 'iphone_mirror'],
					description: 'What to capture. "screen" = full display, "window" = specific window by ID, "iphone_mirror" = the iPhone Mirroring app window.'
				},
				displayId: {
					type: 'integer',
					description: 'Optional display ID when target is "screen". Omit for the main display.'
				},
				windowId: {
					type: 'integer',
					description: 'Required when target is "window". The numeric window ID to capture.'
				}
			}
		}
	},

	execute: catchErrors(async ({ target = 'screen', displayId, windowId } = {}) => {
		const targetDir = path.resolve('data/screenshots');
		if (!fs.existsSync(targetDir)) {
			fs.mkdirSync(targetDir, { recursive: true });
		}

		let command;
		let filePath;

		if (target === 'window') {
			if (windowId === undefined || windowId === null || isNaN(parseInt(windowId, 10))) {
				throw new Error('Valid numeric windowId is required when target is "window".');
			}
			filePath = path.join(targetDir, `window_screenshot_${windowId}_${Date.now()}.png`);
			command = `screencapture -x -l ${windowId} "${filePath}"`;
			logger.info(`Taking screenshot of window ${windowId}, saving to: ${filePath}`);

		} else if (target === 'iphone_mirror') {
			const mirrorWindowId = await findIPhoneMirrorWindowId();
			if (!mirrorWindowId) {
				throw new Error('iPhone Mirroring window not found on screen. Make sure the app is open.');
			}
			filePath = path.join(targetDir, `iphone_mirror_screenshot_${Date.now()}.png`);
			command = `screencapture -l ${mirrorWindowId} "${filePath}"`;
			logger.info(`Taking iPhone Mirroring screenshot (windowId=${mirrorWindowId}), saving to: ${filePath}`);

		} else {
			// Default: full screen
			filePath = path.join(targetDir, `screenshot_${Date.now()}.png`);
			command = displayId
				? `screencapture -x -D ${displayId} "${filePath}"`
				: `screencapture -x "${filePath}"`;
			logger.info(`Taking screen screenshot, saving to: ${filePath}`);
		}

		await execAsync(command);
		return `Screenshot saved to ${filePath}`;
	}, 'Failed to take screenshot')
};
