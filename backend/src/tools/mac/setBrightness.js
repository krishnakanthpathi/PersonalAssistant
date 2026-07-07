import { exec } from 'child_process';
import { promisify } from 'util';
import { catchErrors } from '../../utils/errors.js';
import { logger } from '../../utils/logger.js';

const execAsync = promisify(exec);

export const setBrightnessTool = {
	definition: {
		name: 'set_brightness',
		description: 'Sets the display brightness level (0 to 100) on macOS.',
		parameters: {
			type: 'object',
			properties: {
				level: {
					type: 'integer',
					description: 'The brightness level percentage to set (0 to 100).'
				}
			},
			required: ['level']
		}
	},

	execute: catchErrors(async ({ level }) => {
		if (level === undefined || level < 0 || level > 100) {
			throw new Error('Brightness level must be an integer between 0 and 100');
		}
		
		logger.info(`Setting screen brightness to: ${level}%`);

		// Method 1: Try using the Homebrew `brightness` CLI tool
		try {
			let brightnessPath = 'brightness';
			try {
				const { stdout } = await execAsync('which brightness');
				brightnessPath = stdout.trim();
			} catch {
				// Check common homebrew path on Apple Silicon
				try {
					await execAsync('test -f /opt/homebrew/bin/brightness');
					brightnessPath = '/opt/homebrew/bin/brightness';
				} catch {
					throw new Error('brightness CLI utility not found');
				}
			}

			const targetLevel = level / 100;
			logger.info(`Attempting to set brightness via CLI tool: ${brightnessPath} ${targetLevel}`);
			const { stdout, stderr } = await execAsync(`"${brightnessPath}" ${targetLevel}`);
			
			const output = (stdout + '\n' + stderr).toLowerCase();
			if (output.includes('failed')) {
				throw new Error(stdout + '\n' + stderr);
			}

			return `Display brightness set to ${level}% using brightness CLI utility.`;
		} catch (cliError) {
			logger.warn(`brightness CLI failed or not available (${cliError.message.trim()}). Falling back to keypress simulation...`);

			// Method 2: Fallback to simulating brightness keys via AppleScript
			// macOS has 16 increments of display brightness
			const steps = Math.round((level / 100) * 16);
			
			// We simulate pressing "Brightness Down" 16 times to force it to 0,
			// and then press "Brightness Up" the required number of steps.
			// Key codes:
			// 145 (Down) and 144 (Up) - standard/external keyboard
			// 107 (Down) and 113 (Up) - built-in keyboard
			const appleScript = `
				tell application "System Events"
					repeat 16 times
						key code 145
						key code 107
					end repeat
					repeat ${steps} times
						key code 144
						key code 113
					end repeat
				end tell
			`.trim();

			try {
				await execAsync(`osascript -e '${appleScript.replace(/'/g, "'\\''")}'`);
				return `Display brightness set to approximately ${level}% (${steps}/16 steps) using AppleScript keypress simulation.`;
			} catch (scriptError) {
				logger.error(`AppleScript keypress simulation failed: ${scriptError.message}`);
				throw new Error(`Failed to set brightness. Both CLI tool and AppleScript keypress simulation failed: ${scriptError.message}`);
			}
		}
	}, 'Failed to set display brightness')
};

