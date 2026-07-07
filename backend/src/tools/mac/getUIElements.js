import { exec } from 'child_process';
import { promisify } from 'util';
import { catchErrors } from '../../utils/errors.js';
import { logger } from '../../utils/logger.js';

const execAsync = promisify(exec);

/**
 * Queries the macOS Accessibility API via System Events AppleScript to enumerate
 * all interactive UI elements (buttons, text fields, links, etc.) of the frontmost
 * application window, returning their screen coordinates.
 *
 * Uses a multi-script strategy:
 * 1. Fast path: enumerate named UI elements directly from the front process
 * 2. Falls back to walking the full window element tree if needed
 */
async function fetchUIElements() {
	// Get the frontmost app name first
	const appScript = `
tell application "System Events"
	set frontApp to name of first process whose frontmost is true
	return frontApp
end tell`.trim();

	const { stdout: appName } = await execAsync(`osascript << 'APPLESCRIPT'\n${appScript}\nAPPLESCRIPT`);
	const app = appName.trim();
	logger.info(`Fetching UI elements for frontmost app: ${app}`);

	// Enumerate UI elements with position and size from first window
	const elemScript = `
set results to {}
tell application "System Events"
	tell process "${app}"
		set allElements to entire contents of window 1
		repeat with el in allElements
			try
				set r to role of el
				if r is in {"AXButton", "AXTextField", "AXTextArea", "AXLink", "AXCheckBox", "AXRadioButton", "AXStaticText", "AXMenuButton", "AXComboBox", "AXCell", "AXRow"} then
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
					set entry to (r & "|" & t & "|" & (round cx) & "|" & (round cy) & "|" & (item 1 of sz) & "|" & (item 2 of sz))
					set end of results to entry
				end if
			end try
		end repeat
	end tell
end tell
set output to ""
repeat with r in results
	set output to output & r & "\\n"
end repeat
return output`.trim();

	const { stdout: raw } = await execAsync(`osascript << 'APPLESCRIPT'\n${elemScript}\nAPPLESCRIPT`);

	const elements = [];
	const lines = raw.trim().split('\n').filter(Boolean);

	for (const line of lines) {
		const parts = line.split('|');
		if (parts.length < 6) continue;
		const [rawRole, label, x, y, w, h] = parts;
		// Normalize AXButton -> button, AXTextField -> text field, etc.
		const role = rawRole.replace(/^AX/, '').replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase();
		const cx = parseInt(x, 10);
		const cy = parseInt(y, 10);
		const width = parseInt(w, 10);
		const height = parseInt(h, 10);
		if (isNaN(cx) || isNaN(cy)) continue;
		// Skip very small elements (likely hidden/decorative)
		if (width < 5 || height < 5) continue;
		elements.push({ role, label: label.trim(), x: cx, y: cy, width, height });
	}

	return { app, elements };
}

export const getUIElementsTool = {
	definition: {
		name: 'get_ui_elements',
		description: 'Reads all visible interactive UI elements (buttons, text fields, links, checkboxes, text areas, cells) from the frontmost macOS application window using the Accessibility API. Returns each element with its role, label/title, and center screen coordinates (x, y). Use this to understand what is on screen before clicking, to find the location of specific buttons or input fields, or to build a map of the current app UI for automation. Ideal for: finding a send button, locating a contact name, identifying text inputs, reading button labels, listing all clickable elements on screen.',
		parameters: {
			type: 'object',
			properties: {}
		}
	},

	execute: catchErrors(async () => {
		const { app, elements } = await fetchUIElements();

		if (elements.length === 0) {
			return `No accessible UI elements found in "${app}". The app may not support Accessibility API or requires Screen Recording + Accessibility permissions.`;
		}

		const indexed = elements.map((el, i) => ({
			index: i + 1,
			role: el.role,
			label: el.label || '(no label)',
			x: el.x,
			y: el.y,
			width: el.width,
			height: el.height
		}));

		logger.info(`Found ${indexed.length} UI elements in "${app}"`);

		const summary = indexed
			.map(e => `[${e.index}] ${e.role}: "${e.label}" @ (${e.x}, ${e.y})`)
			.join('\n');

		return `UI elements in "${app}" (${indexed.length} total):\n${summary}\n\nFull JSON:\n${JSON.stringify(indexed, null, 2)}`;
	}, 'Failed to get UI elements')
};
