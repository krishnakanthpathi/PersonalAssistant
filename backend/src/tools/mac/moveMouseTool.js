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
					description: 'The horizontal X coordinate (pixels from left edge) to move the mouse to.'
				},
				y: {
					type: 'number',
					description: 'The vertical Y coordinate (pixels from top edge) to move the mouse to.'
				},
				action: {
					type: 'string',
					enum: ['move', 'click', 'double_click', 'right_click'],
					description: 'Action to perform at the destination. Defaults to "move".'
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

		// Build native Swift CoreGraphics script to run instantly without third-party installations.
		const swiftCode = [
			'import CoreGraphics',
			'import Foundation',
			`let point = CGPoint(x: ${ix}, y: ${iy})`,
			'CGWarpMouseCursorPosition(point)',
			'CGAssociateMouseAndMouseCursorPosition(1)'
		];

		if (action !== 'move') {
			const isRight = action === 'right_click';
			const isDouble = action === 'double_click';
			const downType = isRight ? 'CGEventType.rightMouseDown' : 'CGEventType.leftMouseDown';
			const upType = isRight ? 'CGEventType.rightMouseUp' : 'CGEventType.leftMouseUp';
			const btn = isRight ? 'CGMouseButton.right' : 'CGMouseButton.left';

			const clickCode = [
				`let down = CGEvent(mouseEventSource: nil, mouseType: ${downType}, mouseCursorPosition: point, mouseButton: ${btn})!`,
				`let up   = CGEvent(mouseEventSource: nil, mouseType: ${upType},   mouseCursorPosition: point, mouseButton: ${btn})!`,
				'down.post(tap: .cghidEventTap)',
				'Thread.sleep(forTimeInterval: 0.05)',
				'up.post(tap: .cghidEventTap)'
			].join('\n');

			swiftCode.push('Thread.sleep(forTimeInterval: 0.05)', clickCode);
			if (isDouble) {
				swiftCode.push('Thread.sleep(forTimeInterval: 0.08)', clickCode);
			}
		}

		const scriptContent = swiftCode.join('\n');
		await execAsync(`swift - << 'SWIFT_EOF'\n${scriptContent}\nSWIFT_EOF`);

		return `Mouse action "${action}" at (${ix}, ${iy}) completed successfully.`;
	}, 'Failed to execute move_mouse action')
};
