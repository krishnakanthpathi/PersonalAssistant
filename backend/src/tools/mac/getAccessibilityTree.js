import { exec } from 'child_process';
import { promisify } from 'util';
import { catchErrors } from '../../utils/errors.js';
import { logger } from '../../utils/logger.js';

const execAsync = promisify(exec);

export const getAccessibilityTreeTool = {
	definition: {
		name: 'get_accessibility_tree',
		description: 'Returns the full hierarchical UI accessibility tree of the active window of the frontmost application (or a specified application process) as a structured JSON object. For each element, it returns the role, title/name, screen coordinates (x, y), dimensions (width, height), and child elements. Use this to inspect the UI of the current app for navigation, locating buttons, text fields, lists, and building automation plans.',
		parameters: {
			type: 'object',
			properties: {
				app: {
					type: 'string',
					description: 'Optional name of the target application process (defaults to the frontmost process).'
				}
			}
		}
	},

	execute: catchErrors(async ({ app } = {}) => {
		let targetApp = app;

		// Get frontmost app name if not provided
		if (!targetApp) {
			const { stdout: appRaw } = await execAsync(
				`osascript -e 'tell application "System Events" to set frontApp to name of first process whose frontmost is true\nreturn frontApp'`
			);
			targetApp = appRaw.trim();
		}

		logger.info(`Fetching accessibility tree for app: ${targetApp}`);

		const script = `
on escapeString(str)
	if str is missing value then return ""
	set clean to ""
	repeat with char in characters of str
		if char is "\\"" then
			set clean to clean & "'"
		else if char is "\\\\" then
			-- skip
		else
			set clean to clean & char
		end if
	end repeat
	return clean
end escapeString

on getElementJSON(el, depth)
	if depth > 5 then return "" -- limit recursion depth
	tell application "System Events"
		try
			set r to role of el
		on error
			return ""
		end try
		
		set n to ""
		try
			set rawName to name of el
			set n to my escapeString(rawName)
		end try

		set t to ""
		try
			set rawTitle to title of el
			set t to my escapeString(rawTitle)
		end try

		set d to ""
		try
			set rawDesc to description of el
			set d to my escapeString(rawDesc)
		end try

		set coords to ""
		try
			set pos to position of el
			set sz to size of el
			set cx to (item 1 of pos) + (item 1 of sz) / 2
			set cy to (item 2 of pos) + (item 2 of sz) / 2
			set coords to ",\\"x\\":" & (round cx) & ",\\"y\\":" & (round cy) & ",\\"w\\":" & (round (item 1 of sz)) & ",\\"h\\":" & (round (item 2 of sz))
		end try

		set childJSONs to {}
		try
			set childElements to every UI element of el
			repeat with child in childElements
				set childJSON to my getElementJSON(child, depth + 1)
				if childJSON is not "" then
					copy childJSON to end of childJSONs
				end if
			end repeat
		end try

		set childrenStr to ""
		set listSize to count of childJSONs
		repeat with idx from 1 to listSize
			set childrenStr to childrenStr & item idx of childJSONs
			if idx < listSize then
				set childrenStr to childrenStr & ","
			end if
		end repeat

		return "{\\"role\\":\\"" & r & "\\",\\"name\\":\\"" & n & "\\",\\"title\\":\\"" & t & "\\",\\"description\\":\\"" & d & "\\"" & coords & ",\\"children\\":[" & childrenStr & "]}"
	end tell
end getElementJSON

tell application "System Events"
	tell process "${targetApp}"
		try
			set w to window 1
			set json to my getElementJSON(w, 0)
			return json
		on error err
			return "Error: " & err
		end try
	end tell
end tell
		`.trim();

		const { stdout, stderr } = await execAsync(`osascript << 'APPLESCRIPT'\n${script}\nAPPLESCRIPT`);

		if (stderr) {
			throw new Error(stderr);
		}

		const result = stdout.trim();
		if (result.startsWith('Error:')) {
			return `Failed to fetch accessibility tree for "${targetApp}". Make sure the application is open and has an active window. Detail: ${result}`;
		}

		try {
			// Validate that the output is indeed parseable JSON, then return it pretty-printed
			const parsed = JSON.parse(result);
			return JSON.stringify(parsed, null, 2);
		} catch (e) {
			logger.warn(`Could not parse returned accessibility tree JSON: ${e.message}. Returning raw text.`);
			return result;
		}
	}, 'Failed to get accessibility tree')
};
