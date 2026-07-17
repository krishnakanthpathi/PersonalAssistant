import { exec } from 'child_process';
import { promisify } from 'util';
import { catchErrors } from '../../utils/errors.js';
import { logger } from '../../utils/logger.js';

const execAsync = promisify(exec);

export const shortcutListTool = {
	definition: {
		name: 'shortcut_list',
		description: 'List Apple Shortcuts on this Mac (optional folder filter).',
		parameters: {
			type: 'object',
			properties: {
				folder: { type: 'string', description: 'Optional folder name to filter shortcuts.' }
			}
		}
	},
	execute: catchErrors(async ({ folder }) => {
		logger.info(`Listing shortcuts${folder ? ` in folder: ${folder}` : ''}`);
		const cmd = folder ? `shortcuts list --folder "${folder.replace(/"/g, '\\"')}"` : 'shortcuts list';
		const { stdout } = await execAsync(cmd);
		const list = stdout.trim().split('\n').filter(Boolean);
		return JSON.stringify(list, null, 2);
	}, 'Failed to list shortcuts')
};

export const shortcutRunTool = {
	definition: {
		name: 'shortcut_run',
		description: 'Run an Apple Shortcut by name (optional input/output paths). 60 s timeout.',
		parameters: {
			type: 'object',
			properties: {
				name: { type: 'string', description: 'Name of the shortcut.' },
				inputPath: { type: 'string', description: 'Optional path to input file.' },
				outputPath: { type: 'string', description: 'Optional path to save output file.' }
			},
			required: ['name']
		}
	},
	execute: catchErrors(async ({ name, inputPath, outputPath }) => {
		logger.info(`Running shortcut "${name}"`);
		let cmd = `shortcuts run "${name.replace(/"/g, '\\"')}"`;
		if (inputPath) cmd += ` -i "${inputPath.replace(/"/g, '\\"')}"`;
		if (outputPath) cmd += ` -o "${outputPath.replace(/"/g, '\\"')}"`;

		const { stdout, stderr } = await execAsync(cmd, { timeout: 60000 });
		return `Shortcut executed successfully. Output: ${stdout.trim() || 'No output.'} ${stderr.trim() ? `Errors: ${stderr}` : ''}`;
	}, 'Failed to run shortcut')
};

export const waitMsTool = {
	definition: {
		name: 'wait_ms',
		description: 'Sleep/wait for N milliseconds (maximum 60000 ms).',
		parameters: {
			type: 'object',
			properties: {
				ms: { type: 'integer', description: 'Milliseconds to wait.' }
			},
			required: ['ms']
		}
	},
	execute: catchErrors(async ({ ms }) => {
		const delay = Math.min(Math.max(ms, 0), 60000);
		logger.info(`Waiting for ${delay} ms...`);
		await new Promise(resolve => setTimeout(resolve, delay));
		return `Finished waiting for ${delay} ms.`;
	}, 'Failed during wait')
};
