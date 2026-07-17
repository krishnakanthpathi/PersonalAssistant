import { exec } from 'child_process';
import { promisify } from 'util';
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

export const listAppsTool = {
	definition: {
		name: 'list_apps',
		description: 'List running GUI applications on macOS (bundle id, name, pid, frontmost).',
		parameters: {
			type: 'object',
			properties: {}
		}
	},
	execute: catchErrors(async () => {
		logger.info('Listing running applications...');
		const script = `
			tell application "System Events"
				set procList to every process whose background only is false
				set outputText to ""
				repeat with p in procList
					try
						set pidVal to unix id of p
						set nameVal to name of p
						set frontVal to frontmost of p
						set bundleVal to bundle identifier of p
						set outputText to outputText & bundleVal & ";" & nameVal & ";" & pidVal & ";" & frontVal & "\\n"
					end try
				end repeat
				return outputText
			end tell
		`;
		const result = await runAppleScript(script);
		if (!result || result.trim() === '') return 'No running GUI applications found.';
		const lines = result.trim().split('\n');
		const apps = lines.map(line => {
			const [bundleId, name, pid, frontmost] = line.split(';');
			return { bundleId, name, pid: parseInt(pid, 10), frontmost: frontmost === 'true' };
		});
		return JSON.stringify(apps, null, 2);
	}, 'Failed to list running apps')
};

export const listWindowsTool = {
	definition: {
		name: 'list_windows',
		description: 'List on-screen windows with title, owner app, pid, bounds, and window layer.',
		parameters: {
			type: 'object',
			properties: {}
		}
	},
	execute: catchErrors(async () => {
		logger.info('Listing visible windows...');
		const swiftCode = `
			import Cocoa
			let options = CGWindowListOption(arrayLiteral: .excludeDesktopElements, .optionOnScreenOnly)
			guard let list = CGWindowListCopyWindowInfo(options, kCGNullWindowID) as? [[String: Any]] else {
				print("[]")
				exit(0)
			}
			var res: [[String: Any]] = []
			for w in list {
				let layer = w[kCGWindowLayer as String] as? Int ?? 0
				if layer > 50 { continue } // skip overlays and system elements
				let pid = w[kCGWindowOwnerPID as String] as? Int ?? 0
				let owner = w[kCGWindowOwnerName as String] as? String ?? ""
				let title = w[kCGWindowName as String] as? String ?? ""
				let winId = w[kCGWindowNumber as String] as? Int ?? 0
				let bounds = w[kCGWindowBounds as String] as? [String: Any] ?? [:]
				res.append([
					"id": winId,
					"title": title,
					"owner": owner,
					"pid": pid,
					"layer": layer,
					"bounds": bounds
				])
			}
			if let data = try? JSONSerialization.data(withJSONObject: res, options: .prettyPrinted),
			   let str = String(data: data, encoding: .utf8) {
				print(str)
			}
		`;
		const output = await runSwiftCode(swiftCode);
		return output;
	}, 'Failed to list windows')
};

export const focusAppTool = {
	definition: {
		name: 'focus_app',
		description: 'Activate and focus an application by bundle id or name.',
		parameters: {
			type: 'object',
			properties: {
				bundleId: { type: 'string', description: 'The bundle identifier of the app (e.g., "com.apple.Safari").' },
				name: { type: 'string', description: 'The display name of the app (e.g., "Safari").' }
			}
		}
	},
	execute: catchErrors(async ({ bundleId, name }) => {
		if (!bundleId && !name) throw new Error('Either bundleId or name is required');
		const target = bundleId ? `-b "${bundleId}"` : `-a "${name}"`;
		logger.info(`Focusing app: ${bundleId || name}`);
		await execAsync(`open ${target}`);
		return `Application "${bundleId || name}" activated successfully.`;
	}, 'Failed to focus app')
};

export const focusWindowTool = {
	definition: {
		name: 'focus_window',
		description: 'Raise and focus a specific window by its window number ID.',
		parameters: {
			type: 'object',
			properties: {
				id: { type: 'integer', description: 'The numeric ID of the window to focus.' }
			},
			required: ['id']
		}
	},
	execute: catchErrors(async ({ id }) => {
		logger.info(`Focusing window: ${id}`);
		const swiftCode = `
			import Cocoa
			import ApplicationServices

			let targetId = Int32(CommandLine.arguments[1]) ?? 0
			let options = CGWindowListOption(arrayLiteral: .excludeDesktopElements, .optionOnScreenOnly)
			guard let list = CGWindowListCopyWindowInfo(options, kCGNullWindowID) as? [[String: Any]] else {
				exit(1)
			}

			var targetPid: pid_t? = nil
			var targetTitle: String? = nil
			for w in list {
				let winId = w[kCGWindowNumber as String] as? Int32 ?? 0
				if winId == targetId {
					targetPid = w[kCGWindowOwnerPID as String] as? pid_t
					targetTitle = w[kCGWindowName as String] as? String
					break
				}
			}

			guard let pid = targetPid else {
				print("Window \\(targetId) not found in on-screen window list.")
				exit(1)
			}

			if let app = NSRunningApplication(processIdentifier: pid) {
				app.activate(options: .activateIgnoringOtherApps)
			}

			let axApp = AXUIElementCreateApplication(pid)
			var windowList: AnyObject?
			let result = AXUIElementCopyAttributeValue(axApp, kAXWindowsAttribute as CFString, &windowList)

			if result == .success, let windows = windowList as? [AXUIElement] {
				for w in windows {
					var titleVal: AnyObject?
					AXUIElementCopyAttributeValue(w, kAXTitleAttribute as CFString, &titleVal)
					let title = titleVal as? String ?? ""
					
					if targetTitle != nil && title == targetTitle {
						AXUIElementPerformAction(w, kAXRaiseAction as CFString)
						print("Window raised")
						exit(0)
					}
				}
			}
			print("Activated application holding the window.")
		`;
		const result = await runSwiftCode(swiftCode, [String(id)]);
		return result.trim();
	}, 'Failed to focus window')
};

export const moveWindowTool = {
	definition: {
		name: 'move_window',
		description: 'Move a window to (x, y) screen coordinates via Accessibility API.',
		parameters: {
			type: 'object',
			properties: {
				id: { type: 'integer', description: 'The numeric ID of the window.' },
				x: { type: 'integer', description: 'Target X coordinate.' },
				y: { type: 'integer', description: 'Target Y coordinate.' }
			},
			required: ['id', 'x', 'y']
		}
	},
	execute: catchErrors(async ({ id, x, y }) => {
		logger.info(`Moving window ${id} to (${x}, ${y})`);
		const swiftCode = `
			import Cocoa
			import ApplicationServices

			let targetId = Int32(CommandLine.arguments[1]) ?? 0
			let targetX = CGFloat(Double(CommandLine.arguments[2]) ?? 0.0)
			let targetY = CGFloat(Double(CommandLine.arguments[3]) ?? 0.0)

			let options = CGWindowListOption(arrayLiteral: .excludeDesktopElements, .optionOnScreenOnly)
			guard let list = CGWindowListCopyWindowInfo(options, kCGNullWindowID) as? [[String: Any]] else {
				exit(1)
			}

			var targetPid: pid_t? = nil
			var targetTitle: String? = nil
			for w in list {
				let winId = w[kCGWindowNumber as String] as? Int32 ?? 0
				if winId == targetId {
					targetPid = w[kCGWindowOwnerPID as String] as? pid_t
					targetTitle = w[kCGWindowName as String] as? String
					break
				}
			}

			guard let pid = targetPid else {
				print("Window not found")
				exit(1)
			}

			let axApp = AXUIElementCreateApplication(pid)
			var windowList: AnyObject?
			let result = AXUIElementCopyAttributeValue(axApp, kAXWindowsAttribute as CFString, &windowList)

			if result == .success, let windows = windowList as? [AXUIElement] {
				for w in windows {
					var titleVal: AnyObject?
					AXUIElementCopyAttributeValue(w, kAXTitleAttribute as CFString, &titleVal)
					let title = titleVal as? String ?? ""
					
					if targetTitle != nil && title == targetTitle {
						var pos = CGPoint(x: targetX, y: targetY)
						if let axPos = AXValueCreate(.cfPoint, &pos) {
							let err = AXUIElementSetAttributeValue(w, kAXPositionAttribute as CFString, axPos)
							if err == .success {
								print("Window moved successfully.")
								exit(0)
							} else {
								print("Accessibility error setting position: \\(err.rawValue)")
								exit(1)
							}
						}
					}
				}
			}
			print("Could not move window.")
			exit(1)
		`;
		const result = await runSwiftCode(swiftCode, [String(id), String(x), String(y)]);
		return result.trim();
	}, 'Failed to move window')
};

export const resizeWindowTool = {
	definition: {
		name: 'resize_window',
		description: 'Resize a window to (width, height) coordinates via Accessibility API.',
		parameters: {
			type: 'object',
			properties: {
				id: { type: 'integer', description: 'The numeric ID of the window.' },
				width: { type: 'integer', description: 'Target width.' },
				height: { type: 'integer', description: 'Target height.' }
			},
			required: ['id', 'width', 'height']
		}
	},
	execute: catchErrors(async ({ id, width, height }) => {
		logger.info(`Resizing window ${id} to ${width}x${height}`);
		const swiftCode = `
			import Cocoa
			import ApplicationServices

			let targetId = Int32(CommandLine.arguments[1]) ?? 0
			let targetW = CGFloat(Double(CommandLine.arguments[2]) ?? 0.0)
			let targetH = CGFloat(Double(CommandLine.arguments[3]) ?? 0.0)

			let options = CGWindowListOption(arrayLiteral: .excludeDesktopElements, .optionOnScreenOnly)
			guard let list = CGWindowListCopyWindowInfo(options, kCGNullWindowID) as? [[String: Any]] else {
				exit(1)
			}

			var targetPid: pid_t? = nil
			var targetTitle: String? = nil
			for w in list {
				let winId = w[kCGWindowNumber as String] as? Int32 ?? 0
				if winId == targetId {
					targetPid = w[kCGWindowOwnerPID as String] as? pid_t
					targetTitle = w[kCGWindowName as String] as? String
					break
				}
			}

			guard let pid = targetPid else {
				print("Window not found")
				exit(1)
			}

			let axApp = AXUIElementCreateApplication(pid)
			var windowList: AnyObject?
			let result = AXUIElementCopyAttributeValue(axApp, kAXWindowsAttribute as CFString, &windowList)

			if result == .success, let windows = windowList as? [AXUIElement] {
				for w in windows {
					var titleVal: AnyObject?
					AXUIElementCopyAttributeValue(w, kAXTitleAttribute as CFString, &titleVal)
					let title = titleVal as? String ?? ""
					
					if targetTitle != nil && title == targetTitle {
						var size = CGSize(width: targetW, height: targetH)
						if let axSize = AXValueCreate(.cfSize, &size) {
							let err = AXUIElementSetAttributeValue(w, kAXSizeAttribute as CFString, axSize)
							if err == .success {
								print("Window resized successfully.")
								exit(0)
							} else {
								print("Accessibility error setting size: \\(err.rawValue)")
								exit(1)
							}
						}
					}
				}
			}
			print("Could not resize window.")
			exit(1)
		`;
		const result = await runSwiftCode(swiftCode, [String(id), String(width), String(height)]);
		return result.trim();
	}, 'Failed to resize window')
};

export const setSpaceTool = {
	definition: {
		name: 'set_space',
		description: 'Switch to a Mission Control space by index.',
		parameters: {
			type: 'object',
			properties: {
				index: { type: 'integer', description: 'Index of the Mission Control space (1-indexed).' }
			},
			required: ['index']
		}
	},
	execute: catchErrors(async ({ index }) => {
		logger.info(`Switching to space index ${index}...`);
		// Space indices can be activated via control + number key codes.
		// Key codes: '1' is 18, '2' is 19, '3' is 20, '4' is 21, '5' is 23, '6' is 22, '7' is 26, '8' is 28, '9' is 25
		const keyCodeMap = { 1: 18, 2: 19, 3: 20, 4: 21, 5: 23, 6: 22, 7: 26, 8: 28, 9: 25 };
		const code = keyCodeMap[index];
		if (!code) {
			throw new Error(`Unsupported space index: ${index}. Only 1-9 are supported.`);
		}
		const script = `tell application "System Events" to key code ${code} using control down`;
		await runAppleScript(script);
		return `Switched to space ${index} successfully.`;
	}, 'Failed to set space')
};
