/**
 * Frontmost application title/metadata tracker
 */
import { runAppleScript } from './appleScript.js';

export async function getActiveWindow() {
	const script = 'tell application "System Events" to get name of first process whose frontmost is true';
	return runAppleScript(script);
}
