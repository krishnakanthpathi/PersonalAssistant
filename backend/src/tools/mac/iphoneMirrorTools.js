import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { catchErrors } from '../../utils/errors.js';
import { logger } from '../../utils/logger.js';

const execAsync = promisify(exec);

export const iphoneMirrorTool = {
	definition: {
		name: 'iphone_mirror',
		description: 'iPhone Mirroring launcher: launch, focus, or capture screenshots.',
		parameters: {
			type: 'object',
			properties: {
				action: { type: 'string', enum: ['launch', 'focus', 'screenshot'], description: 'The iPhone Mirroring action.' }
			},
			required: ['action']
		}
	},
	execute: catchErrors(async ({ action }) => {
		logger.info(`Running iPhone Mirroring action: ${action}`);

		if (action === 'launch' || action === 'focus') {
			await execAsync('open -a "iPhone Mirroring"');
			return 'iPhone Mirroring application activated.';
		} else if (action === 'screenshot') {
			// Find iPhone Mirroring window ID
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

			const findWin = new Promise((resolve) => {
				const child = exec('swift -');
				let out = '';
				child.stdout.on('data', d => out += d);
				child.stdin.write(swiftCode);
				child.stdin.end();
				child.on('close', code => {
					resolve(code === 0 ? out.trim() : null);
				});
			});

			const windowId = await findWin;
			if (!windowId) {
				throw new Error('iPhone Mirroring window not found on screen.');
			}

			const targetDir = path.resolve('data/screenshots');
			if (!fs.existsSync(targetDir)) {
				fs.mkdirSync(targetDir, { recursive: true });
			}
			const fileName = `iphone_mirror_screenshot_${Date.now()}.png`;
			const filePath = path.join(targetDir, fileName);

			await execAsync(`screencapture -l ${windowId} "${filePath}"`);
			const base64 = await fs.promises.readFile(filePath, 'base64');
			return base64;
		}
	}, 'Failed to run iPhone Mirroring action')
};
