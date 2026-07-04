/**
 * System commands executed via PowerShell
 */
import { exec } from 'child_process';

export function runPowerShell(command) {
	return new Promise((resolve, reject) => {
		exec(`powershell -Command "${command.replace(/"/g, '\\"')}"`, (err, stdout, stderr) => {
			if (err) reject(err);
			else resolve(stdout.trim());
		});
	});
}
