import { exec } from 'child_process';
import { promisify } from 'util';
import { catchErrors } from '../../utils/errors.js';
import { logger } from '../../utils/logger.js';

const execAsync = promisify(exec);

/**
 * Builds a Swift CoreGraphics inline script for mouse move and click events.
 * Swift is available on any macOS system with Xcode command line tools (zero extra deps).
 */
function buildSwiftScript(ix, iy, action) {
	const moveCode = [
		'import CoreGraphics',
		'import Foundation',
		`let point = CGPoint(x: ${ix}, y: ${iy})`,
		'CGWarpMouseCursorPosition(point)',
		'CGAssociateMouseAndMouseCursorPosition(1)'
	].join('\n');

	if (action === 'move') return moveCode;

	const isRight = action === 'right_click';
	const isDouble = action === 'double_click';
	const downType = isRight ? 'CGEventType.rightMouseDown' : 'CGEventType.leftMouseDown';
	const upType = isRight ? 'CGEventType.rightMouseUp' : 'CGEventType.leftMouseUp';
	const btn = isRight ? 'CGMouseButton.right' : 'CGMouseButton.left';

	const singleClick = [
		`let down = CGEvent(mouseEventSource: nil, mouseType: ${downType}, mouseCursorPosition: point, mouseButton: ${btn})!`,
		`let up   = CGEvent(mouseEventSource: nil, mouseType: ${upType},   mouseCursorPosition: point, mouseButton: ${btn})!`,
		'down.post(tap: .cghidEventTap)',
		'Thread.sleep(forTimeInterval: 0.05)',
		'up.post(tap: .cghidEventTap)'
	].join('\n');

	return [
		moveCode,
		'Thread.sleep(forTimeInterval: 0.05)',
		singleClick,
		isDouble ? `Thread.sleep(forTimeInterval: 0.08)\n${singleClick}` : ''
	].filter(Boolean).join('\n');
}

export const moveMouseTool = {
	definition: {
		name: 'move_mouse',
		description: 'Moves the mouse cursor to a specific position on the screen, and optionally clicks or right-clicks at that position on macOS.',
		parameters: {
			type: 'object',
			properties: {
				x: {
					type: 'number',
					description: 'The horizontal X coordinate (in screen pixels, from the left edge of the screen) to move the mouse to.'
				},
				y: {
					type: 'number',
					description: 'The vertical Y coordinate (in screen pixels, from the top edge of the screen) to move the mouse to.'
				},
				action: {
					type: 'string',
					enum: ['move', 'click', 'double_click', 'right_click'],
					description: 'What to do at the destination: just move the cursor ("move"), single left-click ("click"), double-click ("double_click"), or right-click ("right_click"). Defaults to "move".'
				}
			},
			required: ['x', 'y']
		}
	},

	execute: catchErrors(async ({ x, y, action = 'move' }) => {
		if (typeof x !== 'number' || typeof y !== 'number') {
			throw new Error('x and y must be numeric pixel coordinates.');
		}

		const ix = Math.round(x);
		const iy = Math.round(y);
		logger.info(`Mouse action "${action}" at (${ix}, ${iy})`);

		// --- Tier 1: cliclick (brew install cliclick) — fastest ---
		const tryCliclick = async () => {
			const flag = { move: 'm', click: 'c', double_click: 'dc', right_click: 'rc' }[action] || 'm';
			await execAsync(`cliclick ${flag}:${ix},${iy}`);
		};

		// --- Tier 2: Python pyobjc-Quartz (pip install pyobjc-framework-Quartz) ---
		const tryPython = async () => {
			let pyCode;
			if (action === 'move') {
				pyCode = `import Quartz\npos=Quartz.CGPointMake(${ix},${iy})\nQuartz.CGWarpMouseCursorPosition(pos)\nQuartz.CGAssociateMouseAndMouseCursorPosition(True)`;
			} else {
				const isRight = action === 'right_click';
				const isDouble = action === 'double_click';
				const evDown = isRight ? 'Quartz.kCGEventRightMouseDown' : 'Quartz.kCGEventLeftMouseDown';
				const evUp = isRight ? 'Quartz.kCGEventRightMouseUp' : 'Quartz.kCGEventLeftMouseUp';
				const btn = isRight ? 'Quartz.kCGMouseButtonRight' : 'Quartz.kCGMouseButtonLeft';
				pyCode = [
					`import Quartz,time`,
					`pos=Quartz.CGPointMake(${ix},${iy})`,
					`Quartz.CGWarpMouseCursorPosition(pos)`,
					`Quartz.CGAssociateMouseAndMouseCursorPosition(True)`,
					`time.sleep(0.05)`,
					`def ck(t,b):`,
					` e=Quartz.CGEventCreateMouseEvent(None,t,pos,b)`,
					` Quartz.CGEventPost(Quartz.kCGHIDEventTap,e)`,
					` time.sleep(0.05)`,
					`ck(${evDown},${btn})`,
					`ck(${evUp},${btn})`,
					isDouble ? `ck(${evDown},${btn})\nck(${evUp},${btn})` : ''
				].filter(Boolean).join('\n');
			}
			const escaped = pyCode.replace(/'/g, "'\\''");
			await execAsync(`python3 -c '${escaped}'`);
		};

		// --- Tier 3: Swift CoreGraphics — zero deps, built into every macOS with Xcode CLI ---
		const trySwift = async () => {
			const swiftCode = buildSwiftScript(ix, iy, action);
			await execAsync(`swift - << 'SWIFT_EOF'\n${swiftCode}\nSWIFT_EOF`, { timeout: 10000 });
		};

		// --- Tier 4: AppleScript System Events — click-only last resort ---
		const tryAppleScript = async () => {
			if (action === 'move') {
				throw new Error('move-only is not supported by AppleScript. Install cliclick: brew install cliclick');
			}
			let script;
			if (action === 'double_click') {
				script = `tell application "System Events"\nclick at {${ix}, ${iy}}\ndelay 0.08\nclick at {${ix}, ${iy}}\nend tell`;
			} else if (action === 'right_click') {
				script = `tell application "System Events"\nkey down control\nclick at {${ix}, ${iy}}\nkey up control\nend tell`;
			} else {
				script = `tell application "System Events"\nclick at {${ix}, ${iy}}\nend tell`;
			}
			await execAsync(`osascript << 'APPLESCRIPT'\n${script}\nAPPLESCRIPT`);
			await new Promise(r => setTimeout(r, 150));
		};

		// Run the full fallback chain
		try {
			await tryCliclick();
			logger.info('move_mouse: used cliclick');
		} catch {
			logger.warn('cliclick not found; trying Python/Quartz...');
			try {
				await tryPython();
				logger.info('move_mouse: used Python/Quartz');
			} catch {
				logger.warn('Python/Quartz not available; trying Swift CoreGraphics...');
				try {
					await trySwift();
					logger.info('move_mouse: used Swift CoreGraphics');
				} catch (swiftErr) {
					logger.warn(`Swift failed (${swiftErr.message.split('\n')[0]}); trying AppleScript...`);
					await tryAppleScript();
					logger.info('move_mouse: used AppleScript System Events');
				}
			}
		}

		const actionLabel = {
			move: `moved to (${ix}, ${iy})`,
			click: `clicked at (${ix}, ${iy})`,
			double_click: `double-clicked at (${ix}, ${iy})`,
			right_click: `right-clicked at (${ix}, ${iy})`
		}[action];

		return `Mouse ${actionLabel} successfully.`;
	}, 'Failed to execute move_mouse action')
};
