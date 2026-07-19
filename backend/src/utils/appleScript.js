/**
 * Native app controls via osascript
 */
import { spawn } from 'child_process';

export function runAppleScript(script) {
	return new Promise((resolve, reject) => {
		const child = spawn('osascript', []);
		let stdout = '';
		let stderr = '';

		child.stdout.on('data', (data) => {
			stdout += data.toString();
		});

		child.stderr.on('data', (data) => {
			stderr += data.toString();
		});

		child.on('close', (code) => {
			if (code !== 0) {
				reject(new Error(stderr.trim() || `osascript exited with code ${code}`));
			} else {
				resolve(stdout.trim());
			}
		});

		child.stdin.write(script);
		child.stdin.end();
	});
}

/**
 * Copies a PNG image file to the macOS system clipboard.
 */
export async function copyImageToClipboard(filePath) {
	const escapedPath = filePath.replace(/"/g, '\\"');
	const script = `set the clipboard to (read (POSIX file "${escapedPath}") as «class PNGf»)`;
	return runAppleScript(script);
}
