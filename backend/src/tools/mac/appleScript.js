/**
 * Native app controls via osascript
 */
import { exec } from 'child_process';

export function runAppleScript(script) {
	return new Promise((resolve, reject) => {
		exec(`osascript -e "${script.replace(/"/g, '\\"')}"`, (err, stdout, stderr) => {
			if (err) reject(err);
			else resolve(stdout.trim());
		});
	});
}
