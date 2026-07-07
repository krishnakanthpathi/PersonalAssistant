import { exec } from 'child_process';
import { promisify } from 'util';
import { logger } from './logger.js';

const execAsync = promisify(exec);

/**
 * Fetches interactive UI elements from the frontmost macOS application window.
 *
 * Performance strategy:
 * Instead of the slow `entire contents of window 1` (which recursively walks
 * every single node in the accessibility tree), we query each interactive role
 * directly — `every button`, `every text field`, etc. The Accessibility API
 * handles the filtering internally, making this 5–10x faster for complex apps.
 *
 * @returns {{ app: string, elements: Array<{role,label,x,y,width,height}> }}
 */
export async function fetchUIElements() {
	// Get frontmost app name
	const { stdout: appRaw } = await execAsync(
		`osascript -e 'tell application "System Events" to set frontApp to name of first process whose frontmost is true\nreturn frontApp'`
	);
	const app = appRaw.trim();
	logger.info(`Fetching UI elements for frontmost app: ${app}`);

	// Query each interactive role separately — far faster than `entire contents`
	const script = `
set output to ""
tell application "System Events"
	tell process "${app}"
		set roleGroups to {every button of window 1, every text field of window 1, every text area of window 1, every link of window 1, every checkbox of window 1, every menu button of window 1}
		set roleNames to {"AXButton", "AXTextField", "AXTextArea", "AXLink", "AXCheckBox", "AXMenuButton"}
		set groupIdx to 1
		repeat with roleGroup in roleGroups
			set roleName to item groupIdx of roleNames
			repeat with el in roleGroup
				try
					set t to ""
					try
						set t to description of el
					end try
					if t is "" then
						try
							set t to title of el
						end try
					end if
					if t is "" then
						try
							set t to value of el as string
						end try
					end if
					set pos to position of el
					set sz to size of el
					set cx to (item 1 of pos) + (item 1 of sz) / 2
					set cy to (item 2 of pos) + (item 2 of sz) / 2
					set output to output & roleName & "|" & t & "|" & (round cx) & "|" & (round cy) & "|" & (item 1 of sz) & "|" & (item 2 of sz) & "\\n"
				end try
			end repeat
			set groupIdx to groupIdx + 1
		end repeat
	end tell
end tell
return output`.trim();

	const { stdout: raw } = await execAsync(`osascript << 'APPLESCRIPT'\n${script}\nAPPLESCRIPT`);

	const elements = [];
	for (const line of raw.trim().split('\n').filter(Boolean)) {
		const parts = line.split('|');
		if (parts.length < 6) continue;
		const [rawRole, label, x, y, w, h] = parts;
		const role = rawRole.replace(/^AX/, '').replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase();
		const cx = parseInt(x, 10), cy = parseInt(y, 10);
		const width = parseInt(w, 10), height = parseInt(h, 10);
		if (isNaN(cx) || isNaN(cy) || width < 5 || height < 5) continue;
		elements.push({ role, label: label.trim(), x: cx, y: cy, width, height });
	}

	return { app, elements };
}
