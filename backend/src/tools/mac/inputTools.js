import { exec } from 'child_process';
import { promisify } from 'util';
import { catchErrors } from '../../utils/errors.js';
import { logger } from '../../utils/logger.js';

const execAsync = promisify(exec);
const CLICLICK_PATH = '/opt/homebrew/bin/cliclick';

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

export const mouseMoveTool = {
	definition: {
		name: 'mouse_move',
		description: 'Move the mouse cursor to global screen coordinates (x, y).',
		parameters: {
			type: 'object',
			properties: {
				x: { type: 'integer' },
				y: { type: 'integer' }
			},
			required: ['x', 'y']
		}
	},
	execute: catchErrors(async ({ x, y }) => {
		logger.info(`Moving mouse to (${x}, ${y})`);
		await execAsync(`"${CLICLICK_PATH}" m:${x},${y}`);
		return `Mouse moved to (${x}, ${y}).`;
	}, 'Failed to move mouse')
};

export const mouseClickTool = {
	definition: {
		name: 'mouse_click',
		description: 'Click at (x, y) with optional button, count, and modifiers.',
		parameters: {
			type: 'object',
			properties: {
				x: { type: 'integer' },
				y: { type: 'integer' },
				button: { type: 'string', enum: ['left', 'right', 'middle'], default: 'left' },
				count: { type: 'integer', default: 1 },
				modifiers: {
					type: 'array',
					items: { type: 'string', enum: ['command', 'option', 'control', 'shift'] },
					description: 'Modifier keys to hold down during click.'
				}
			},
			required: ['x', 'y']
		}
	},
	execute: catchErrors(async ({ x, y, button = 'left', count = 1, modifiers = [] }) => {
		logger.info(`Mouse click at (${x}, ${y}) [button: ${button}, count: ${count}, modifiers: ${modifiers.join('+')}]`);
		
		let cliclickCommand = '';

		// Add modifiers down
		if (modifiers.length > 0) {
			const mappedMods = modifiers.map(m => m === 'command' ? 'cmd' : m === 'option' ? 'alt' : m === 'control' ? 'ctrl' : m);
			cliclickCommand += `kd:${mappedMods.join(',')} `;
		}

		// Click command based on button and click count
		let clickAction = 'c';
		if (button === 'right') {
			clickAction = 'rc';
		} else {
			if (count === 2) clickAction = 'dc';
			if (count === 3) clickAction = 'tc';
		}

		cliclickCommand += `${clickAction}:${x},${y}`;

		// Add modifiers up
		if (modifiers.length > 0) {
			const mappedMods = modifiers.map(m => m === 'command' ? 'cmd' : m === 'option' ? 'alt' : m === 'control' ? 'ctrl' : m);
			cliclickCommand += ` ku:${mappedMods.join(',')}`;
		}

		await execAsync(`"${CLICLICK_PATH}" ${cliclickCommand}`);
		return `Mouse clicked at (${x}, ${y}) successfully.`;
	}, 'Failed to perform mouse click')
};

export const mouseDragTool = {
	definition: {
		name: 'mouse_drag',
		description: 'Press, drag, and release mouse from (fromX, fromY) to (toX, toY).',
		parameters: {
			type: 'object',
			properties: {
				fromX: { type: 'integer' },
				fromY: { type: 'integer' },
				toX: { type: 'integer' },
				toY: { type: 'integer' }
			},
			required: ['fromX', 'fromY', 'toX', 'toY']
		}
	},
	execute: catchErrors(async ({ fromX, fromY, toX, toY }) => {
		logger.info(`Mouse drag from (${fromX}, ${fromY}) to (${toX}, ${toY})`);
		await execAsync(`"${CLICLICK_PATH}" dd:${fromX},${fromY} dm:${toX},${toY} du:${toX},${toY}`);
		return `Mouse dragged successfully.`;
	}, 'Failed to drag mouse')
};

export const mouseScrollTool = {
	definition: {
		name: 'mouse_scroll',
		description: 'Send a scroll-wheel event in line or pixel units.',
		parameters: {
			type: 'object',
			properties: {
				dx: { type: 'integer', description: 'Horizontal scroll delta.' },
				dy: { type: 'integer', description: 'Vertical scroll delta.' },
				unit: { type: 'string', enum: ['line', 'pixel'], default: 'line' }
			},
			required: ['dx', 'dy']
		}
	},
	execute: catchErrors(async ({ dx, dy, unit = 'line' }) => {
		logger.info(`Mouse scrolling by dx=${dx}, dy=${dy} (${unit}s)`);
		const swiftCode = `
			import Cocoa
			let dx = Int32(CommandLine.arguments[1]) ?? 0
			let dy = Int32(CommandLine.arguments[2]) ?? 0
			let unitType = CommandLine.arguments[3]
			let units: CGScrollEventUnit = (unitType == "pixel") ? .pixel : .line
			let event = CGEvent(scrollWheelEvent2Source: nil, units: units, wheelCount: 2, wheel1: dy, wheel2: dx, wheel3: 0)
			event?.post(tap: .cghidEventTap)
		`;
		await runSwiftCode(swiftCode, [String(dx), String(dy), unit]);
		return `Scrolled successfully.`;
	}, 'Failed to scroll')
};

export const keyPressTool = {
	definition: {
		name: 'key_press',
		description: 'Press a single key or shortcut (named key + modifiers) on macOS.',
		parameters: {
			type: 'object',
			properties: {
				key: { type: 'string', description: 'The name of the key (e.g. "enter", "space", "esc", "tab", "arrow-up").' },
				modifiers: {
					type: 'array',
					items: { type: 'string', enum: ['command', 'option', 'control', 'shift'] }
				}
			},
			required: ['key']
		}
	},
	execute: catchErrors(async ({ key, modifiers = [] }) => {
		logger.info(`Pressing key "${key}" with modifiers: [${modifiers.join(', ')}]`);

		const keyMap = {
			'enter': 'enter',
			'return': 'return',
			'space': 'space',
			'tab': 'tab',
			'esc': 'esc',
			'escape': 'esc',
			'arrow-up': 'arrow-up',
			'up': 'arrow-up',
			'arrow-down': 'arrow-down',
			'down': 'arrow-down',
			'arrow-left': 'arrow-left',
			'left': 'arrow-left',
			'arrow-right': 'arrow-right',
			'right': 'arrow-right',
			'delete': 'delete',
			'backspace': 'delete',
			'f1': 'f1', 'f2': 'f2', 'f3': 'f3', 'f4': 'f4', 'f5': 'f5', 'f6': 'f6',
			'f7': 'f7', 'f8': 'f8', 'f9': 'f9', 'f10': 'f10', 'f11': 'f11', 'f12': 'f12'
		};

		const cleanKey = keyMap[key.toLowerCase()] || key.toLowerCase();
		let cliclickCommand = '';

		if (modifiers.length > 0) {
			const mappedMods = modifiers.map(m => m === 'command' ? 'cmd' : m === 'option' ? 'alt' : m === 'control' ? 'ctrl' : m);
			cliclickCommand += `kd:${mappedMods.join(',')} `;
		}

		cliclickCommand += `kp:${cleanKey}`;

		if (modifiers.length > 0) {
			const mappedMods = modifiers.map(m => m === 'command' ? 'cmd' : m === 'option' ? 'alt' : m === 'control' ? 'ctrl' : m);
			cliclickCommand += ` ku:${mappedMods.join(',')}`;
		}

		await execAsync(`"${CLICLICK_PATH}" ${cliclickCommand}`);
		return `Key pressed successfully.`;
	}, 'Failed to press key')
};

export const typeTextTool = {
	definition: {
		name: 'type_text',
		description: 'Type a Unicode string into the active input field.',
		parameters: {
			type: 'object',
			properties: {
				text: { type: 'string', description: 'The text to type.' }
			},
			required: ['text']
		}
	},
	execute: catchErrors(async ({ text }) => {
		if (!text) throw new Error('Text parameter is required for typing action');
		logger.info(`Typing text via clipboard paste: "${text.substring(0, 30)}..."`);
		
		// Read current clipboard to restore it
		let originalClipboard = '';
		try {
			const { stdout } = await execAsync('pbpaste');
			originalClipboard = stdout;
		} catch (err) {
			logger.warn('Failed to read current clipboard:', err.message);
		}

		// Write text to clipboard
		const cpProcess = exec('pbcopy');
		cpProcess.stdin.write(text);
		cpProcess.stdin.end();
		await new Promise(r => setTimeout(r, 50));

		// Paste via Command+V
		await execAsync(`osascript -e 'tell application "System Events" to keystroke "v" using command down'`);
		await new Promise(r => setTimeout(r, 100));

		// Restore original clipboard
		if (originalClipboard) {
			const restoreProcess = exec('pbcopy');
			restoreProcess.stdin.write(originalClipboard);
			restoreProcess.stdin.end();
		}

		return 'Text typed successfully.';
	}, 'Failed to type text')
};
