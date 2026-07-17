import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { runAppleScript } from '../../utils/appleScript.js';
import { catchErrors } from '../../utils/errors.js';
import { logger } from '../../utils/logger.js';

const execAsync = promisify(exec);

// Helper to run Swift code from stdin
async function runSwiftCode(code, args = []) {
	return new Promise((resolve, reject) => {
		const formattedArgs = args.map(arg => `"${arg.replace(/"/g, '\\"')}"`).join(' ');
		const child = exec(`swift - ${formattedArgs}`);
		let output = '';
		let errorOutput = '';

		child.stdout.on('data', d => output += d);
		child.stderr.on('data', d => errorOutput += d);

		child.stdin.write(code);
		child.stdin.end();

		child.on('close', code => {
			if (code === 0) {
				resolve(output);
			} else {
				reject(new Error(errorOutput || `Swift process exited with code ${code}`));
			}
		});
	});
}

export const clipboardReadTool = {
	definition: {
		name: 'clipboard_read',
		description: 'Read the system pasteboard as a typed value (string / image / file_urls / rtf).',
		parameters: {
			type: 'object',
			properties: {
				type: { type: 'string', enum: ['string', 'image', 'file_urls', 'rtf'], default: 'string', description: 'Pasteboard content type.' }
			}
		}
	},
	execute: catchErrors(async ({ type = 'string' }) => {
		logger.info(`Reading clipboard content as type: ${type}`);
		const swiftCode = `
			import Cocoa
			let typeArg = CommandLine.arguments.count >= 2 ? CommandLine.arguments[1] : "string"
			let pb = NSPasteboard.general
			
			if typeArg == "image" {
				if let data = pb.data(forType: .png) {
					print(data.base64EncodedString())
				} else if let data = pb.data(forType: .tiff) {
					if let image = NSImage(data: data),
					   let tiffData = image.tiffRepresentation,
					   let bitmap = NSBitmapImageRep(data: tiffData),
					   let pngData = bitmap.representation(using: .png, properties: [:]) {
						print(pngData.base64EncodedString())
					}
				}
			} else if typeArg == "file_urls" {
				if let classes = [NSURL.self] as? [AnyClass],
				   let urls = pb.readObjects(forClasses: classes, options: nil) as? [URL] {
					let paths = urls.map { $0.path }
					if let jsonData = try? JSONSerialization.data(withJSONObject: paths, options: []),
					   let jsonString = String(data: jsonData, encoding: .utf8) {
						print(jsonString)
					}
				}
			} else if typeArg == "rtf" {
				if let rtfData = pb.data(forType: .rtf) {
					print(rtfData.base64EncodedString())
				}
			} else {
				if let str = pb.string(forType: .string) {
					print(str)
				}
			}
		`;
		const output = await runSwiftCode(swiftCode, [type]);
		return output.trim();
	}, 'Failed to read clipboard')
};

export const clipboardWriteTool = {
	definition: {
		name: 'clipboard_write',
		description: 'Write a typed value (string / image / file_urls / rtf) to the system pasteboard.',
		parameters: {
			type: 'object',
			properties: {
				type: { type: 'string', enum: ['string', 'image', 'file_urls', 'rtf'], default: 'string' },
				value: { type: 'string', description: 'The text or base64 encoded data to write. For file_urls, provide a JSON list of paths.' }
			},
			required: ['value']
		}
	},
	execute: catchErrors(async ({ type = 'string', value }) => {
		logger.info(`Writing clipboard content as type: ${type}`);
		const swiftCode = `
			import Cocoa
			guard CommandLine.arguments.count >= 3 else {
				exit(1)
			}
			let typeArg = CommandLine.arguments[1]
			let val = CommandLine.arguments[2]
			let pb = NSPasteboard.general
			pb.clearContents()
			
			if typeArg == "image" {
				if let data = Data(base64Encoded: val) {
					pb.setData(data, forType: .png)
				}
			} else if typeArg == "file_urls" {
				if let data = val.data(using: .utf8),
				   let paths = try? JSONSerialization.jsonObject(with: data, options: []) as? [String] {
					let urls = paths.map { URL(fileURLWithPath: $0) as NSURL }
					pb.writeObjects(urls)
				}
			} else if typeArg == "rtf" {
				if let data = Data(base64Encoded: val) {
					pb.setData(data, forType: .rtf)
				}
			} else {
				pb.setString(val, forType: .string)
			}
			print("Clipboard updated.")
		`;
		const output = await runSwiftCode(swiftCode, [type, value]);
		return output.trim();
	}, 'Failed to write clipboard')
};

export const notifyTool = {
	definition: {
		name: 'notify',
		description: 'Post a notification to macOS Notification Center.',
		parameters: {
			type: 'object',
			properties: {
				title: { type: 'string', description: 'Title of the notification.' },
				subtitle: { type: 'string', description: 'Subtitle of the notification.' },
				body: { type: 'string', description: 'Message body.' }
			},
			required: ['title', 'body']
		}
	},
	execute: catchErrors(async ({ title, subtitle = '', body }) => {
		logger.info(`Sending notification: ${title} - ${body}`);
		const escapedTitle = title.replace(/"/g, '\\"');
		const escapedSubtitle = subtitle.replace(/"/g, '\\"');
		const escapedBody = body.replace(/"/g, '\\"');
		
		const script = `display notification "${escapedBody}" with title "${escapedTitle}" subtitle "${escapedSubtitle}"`;
		await runAppleScript(script);
		return 'Notification posted successfully.';
	}, 'Failed to post notification')
};

export const promptUserTool = {
	definition: {
		name: 'prompt_user',
		description: 'Show a native native popup dialog with an input text box and return the user response.',
		parameters: {
			type: 'object',
			properties: {
				message: { type: 'string', description: 'The prompt message/question.' },
				defaultAnswer: { type: 'string', default: '', description: 'Default text filled in the input box.' }
			},
			required: ['message']
		}
	},
	execute: catchErrors(async ({ message, defaultAnswer = '' }) => {
		logger.info(`Prompting user with: "${message}"`);
		const script = `
			tell application "System Events"
				activate
				set response to display dialog "${message.replace(/"/g, '\\"')}" default answer "${defaultAnswer.replace(/"/g, '\\"')}" buttons {"Cancel", "OK"} default button "OK"
				return text returned of response
			end tell
		`;
		const result = await runAppleScript(script);
		return result.trim();
	}, 'Failed to prompt user')
};

export const screenshotScreenTool = {
	definition: {
		name: 'screenshot_screen',
		description: 'Capture the screen (main display or specific display ID) as a base64 PNG.',
		parameters: {
			type: 'object',
			properties: {
				displayId: { type: 'integer', description: 'Optional display ID.' }
			}
		}
	},
	execute: catchErrors(async ({ displayId }) => {
		logger.info(`Taking screenshot of screen...`);
		const tempPath = path.resolve(`./backend/data/temp-screenshot-${Date.now()}.png`);
		
		// Create parent directory if not exist
		const dir = path.dirname(tempPath);
		if (!fs.existsSync(dir)) {
			fs.mkdirSync(dir, { recursive: true });
		}

		let command = `screencapture -x "${tempPath}"`;
		if (displayId) {
			command = `screencapture -x -D ${displayId} "${tempPath}"`;
		}

		try {
			await execAsync(command);
			const base64 = await fs.promises.readFile(tempPath, 'base64');
			return base64;
		} finally {
			if (fs.existsSync(tempPath)) {
				await fs.promises.unlink(tempPath);
			}
		}
	}, 'Failed to take screenshot')
};

export const screenshotWindowTool = {
	definition: {
		name: 'screenshot_window',
		description: 'Capture a specific window by its numeric window number ID as a base64 PNG.',
		parameters: {
			type: 'object',
			properties: {
				windowId: { type: 'integer', description: 'The numeric window ID.' }
			},
			required: ['windowId']
		}
	},
	execute: catchErrors(async ({ windowId }) => {
		logger.info(`Taking screenshot of window ${windowId}...`);
		const tempPath = path.resolve(`./backend/data/temp-win-screenshot-${Date.now()}.png`);
		
		const dir = path.dirname(tempPath);
		if (!fs.existsSync(dir)) {
			fs.mkdirSync(dir, { recursive: true });
		}

		try {
			await execAsync(`screencapture -x -l ${windowId} "${tempPath}"`);
			const base64 = await fs.promises.readFile(tempPath, 'base64');
			return base64;
		} finally {
			if (fs.existsSync(tempPath)) {
				await fs.promises.unlink(tempPath);
			}
		}
	}, 'Failed to take window screenshot')
};
