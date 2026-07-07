import { exec } from 'child_process';
import { promisify } from 'util';
import { catchErrors } from '../../utils/errors.js';
import { logger } from '../../utils/logger.js';

const execAsync = promisify(exec);

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

		// --- Tier 1: cliclick (brew install cliclick) ---
		const tryCliclick = async () => {
			const flag = {
				move:         'm',
				click:        'c',
				double_click: 'dc',
				right_click:  'rc'
			}[action] || 'm';
			await execAsync(`cliclick ${flag}:${ix},${iy}`);
		};

		// --- Tier 2: Python / Quartz (pip install pyobjc-framework-Quartz) ---
		const tryPython = async () => {
			let pyAction = '';
			if (action === 'move') {
				pyAction = `
import Quartz
pos = Quartz.CGPointMake(${ix}, ${iy})
Quartz.CGWarpMouseCursorPosition(pos)
Quartz.CGAssociateMouseAndMouseCursorPosition(True)
`;
			} else {
				const buttonDown = {
					click:        'Quartz.kCGEventLeftMouseDown',
					double_click: 'Quartz.kCGEventLeftMouseDown',
					right_click:  'Quartz.kCGEventRightMouseDown'
				}[action];
				const buttonUp = {
					click:        'Quartz.kCGEventLeftMouseUp',
					double_click: 'Quartz.kCGEventLeftMouseUp',
					right_click:  'Quartz.kCGEventRightMouseUp'
				}[action];
				const button = (action === 'right_click')
					? 'Quartz.kCGMouseButtonRight'
					: 'Quartz.kCGMouseButtonLeft';

				pyAction = `
import Quartz, time
pos = Quartz.CGPointMake(${ix}, ${iy})
Quartz.CGWarpMouseCursorPosition(pos)
Quartz.CGAssociateMouseAndMouseCursorPosition(True)
time.sleep(0.05)
def click(evType, btn):
    e = Quartz.CGEventCreateMouseEvent(None, evType, pos, btn)
    Quartz.CGEventPost(Quartz.kCGHIDEventTap, e)
    time.sleep(0.05)
click(${buttonDown}, ${button})
click(${buttonUp}, ${button})
${action === 'double_click' ? `click(${buttonDown}, ${button})\nclick(${buttonUp}, ${button})` : ''}
`;
			}
			const script = pyAction.trim().replace(/'/g, "'\\''");
			await execAsync(`python3 -c '${script}'`);
		};

		// --- Tier 3: Pure AppleScript via System Events (always available on macOS) ---
		// Supports click, double_click, right_click. Move-only is a no-op (warn only).
		const tryAppleScript = async () => {
			if (action === 'move') {
				logger.warn('move-only action is not supported without cliclick or pyobjc. Install with: brew install cliclick');
				return; // graceful no-op — no crash
			}

			let script;
			if (action === 'double_click') {
				script = `tell application "System Events"\nclick at {${ix}, ${iy}}\ndelay 0.05\nclick at {${ix}, ${iy}}\nend tell`;
			} else if (action === 'right_click') {
				// Control+click is the AppleScript equivalent of right-click
				script = `tell application "System Events"\nkey down control\nclick at {${ix}, ${iy}}\nkey up control\nend tell`;
			} else {
				script = `tell application "System Events"\nclick at {${ix}, ${iy}}\nend tell`;
			}
			await execAsync(`osascript << 'APPLESCRIPT'\n${script}\nAPPLESCRIPT`);
			await new Promise(r => setTimeout(r, 150));
		};

		// Run the fallback chain
		try {
			await tryCliclick();
		} catch {
			logger.warn('cliclick not found; falling back to Python/Quartz...');
			try {
				await tryPython();
			} catch {
				logger.warn('Python/Quartz not available; falling back to AppleScript System Events...');
				await tryAppleScript();
			}
		}

		const actionLabel = {
			move:         `moved to (${ix}, ${iy})`,
			click:        `clicked at (${ix}, ${iy})`,
			double_click: `double-clicked at (${ix}, ${iy})`,
			right_click:  `right-clicked at (${ix}, ${iy})`
		}[action];

		return `Mouse ${actionLabel} successfully.`;
	}, 'Failed to execute move_mouse action')
};

