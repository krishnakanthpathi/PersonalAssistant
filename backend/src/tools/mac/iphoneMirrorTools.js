import { exec } from 'child_process';
import { promisify } from 'util';
import { catchErrors } from '../../utils/errors.js';
import { logger } from '../../utils/logger.js';

const execAsync = promisify(exec);

export const iphoneMirrorTool = {
	definition: {
		name: 'iphone_mirror',
		description: 'iPhone Mirroring launcher: launch or focus the iPhone Mirroring app.',
		parameters: {
			type: 'object',
			properties: {
				action: { type: 'string', enum: ['launch', 'focus'], description: 'The iPhone Mirroring action.' }
			},
			required: ['action']
		}
	},
	execute: catchErrors(async ({ action }) => {
		logger.info(`Running iPhone Mirroring action: ${action}`);
		await execAsync('open -a "iPhone Mirroring"');
		return 'iPhone Mirroring application activated.';
	}, 'Failed to run iPhone Mirroring action')
};
