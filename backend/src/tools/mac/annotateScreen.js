import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';
import sharp from 'sharp';
import { catchErrors } from '../../utils/errors.js';
import { logger } from '../../utils/logger.js';

const execAsync = promisify(exec);

/**
 * Fetches UI element positions from the active app using AppleScript Accessibility API.
 * Returns an array of { role, label, x, y, width, height }.
 */
async function fetchElements() {
	const appScript = `tell application "System Events" to set frontApp to name of first process whose frontmost is true\nreturn frontApp`;
	const { stdout: appRaw } = await execAsync(`osascript -e '${appScript}'`);
	const app = appRaw.trim();

	const elemScript = `
set results to {}
tell application "System Events"
	tell process "${app}"
		set allElements to entire contents of window 1
		repeat with el in allElements
			try
				set r to role of el
				if r is in {"AXButton", "AXTextField", "AXTextArea", "AXLink", "AXCheckBox", "AXStaticText", "AXMenuButton"} then
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

/**
 * Color palette for different element roles — makes the blueprint easy to read.
 */
const ROLE_COLORS = {
	'button':      '#FF4757',  // red
	'text field':  '#2ED573',  // green
	'text area':   '#1E90FF',  // blue
	'link':        '#FFA502',  // orange
	'static text': '#A29BFE',  // purple
	'check box':   '#00CEC9',  // teal
	'menu button': '#FD79A8',  // pink
};
const DEFAULT_COLOR = '#FFFFFF';

export const annotateScreenTool = {
	definition: {
		name: 'annotate_screen',
		description: 'Takes a screenshot of the current macOS screen and overlays a visual blueprint by labeling all detected UI elements (buttons, text fields, links, static text) with numbered colored markers at their exact screen positions. Returns the annotated image file path and a JSON element map of { index, role, label, x, y } for every element. Use this when you need to understand the current screen layout before automating UI actions, when you want to find what buttons or inputs are visible, or when building a plan to click on specific screen elements. Essential for: visual screen analysis, GUI automation planning, finding button coordinates, identifying text fields and contact names.',
		parameters: {
			type: 'object',
			properties: {
				max_elements: {
					type: 'number',
					description: 'Maximum number of UI elements to annotate on the blueprint (default: 40). Reduce for simpler apps.'
				}
			}
		}
	},

	execute: catchErrors(async ({ max_elements = 40 } = {}) => {
		// 1. Capture screenshot
		const targetDir = path.resolve('data/screenshots');
		if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

		const ts = Date.now();
		const rawPath = path.join(targetDir, `raw_${ts}.png`);
		const annotatedPath = path.join(targetDir, `blueprint_${ts}.png`);

		logger.info('Capturing screenshot for blueprint...');
		await execAsync(`screencapture -x "${rawPath}"`);

		// 2. Fetch UI elements via Accessibility API
		let app = 'Unknown', elements = [];
		try {
			({ app, elements } = await fetchElements());
			logger.info(`Fetched ${elements.length} UI elements from "${app}"`);
		} catch (err) {
			logger.warn(`Could not fetch UI elements via Accessibility API: ${err.message}`);
		}

		// 3. Limit elements and build indexed map
		const limited = elements.slice(0, max_elements);
		const elementMap = limited.map((el, i) => ({
			index: i + 1,
			role: el.role,
			label: el.label || '(unlabeled)',
			x: el.x,
			y: el.y
		}));

		// 4. Build SVG overlay — circles + labels for each element
		const svgParts = [];
		for (const el of elementMap) {
			const color = ROLE_COLORS[el.role] || DEFAULT_COLOR;
			const shortLabel = `${el.index}. ${el.label}`.substring(0, 28);
			const lx = el.x + 10;
			const ly = el.y - 6;

			// Circle marker at element center
			svgParts.push(`<circle cx="${el.x}" cy="${el.y}" r="9" fill="${color}" fill-opacity="0.88" stroke="white" stroke-width="1.5"/>`);
			// Index number inside circle
			svgParts.push(`<text x="${el.x}" y="${el.y + 4}" text-anchor="middle" font-family="SF Pro, Arial, sans-serif" font-size="9" font-weight="bold" fill="white">${el.index}</text>`);
			// Label text with dark background pill
			const labelWidth = Math.min(shortLabel.length * 6.5 + 8, 220);
			svgParts.push(`<rect x="${lx}" y="${ly - 11}" width="${labelWidth}" height="14" rx="3" fill="#1a1a1a" fill-opacity="0.72"/>`);
			svgParts.push(`<text x="${lx + 4}" y="${ly}" font-family="SF Pro, Arial, sans-serif" font-size="9" fill="${color}">${shortLabel}</text>`);
		}

		// 5. Get image dimensions and composite SVG overlay
		const meta = await sharp(rawPath).metadata();
		const { width: imgW, height: imgH } = meta;

		// Legend in top-left corner
		const legendLines = Object.entries(ROLE_COLORS)
			.map(([role, color], i) => `<rect x="8" y="${10 + i * 14}" width="10" height="10" rx="2" fill="${color}"/><text x="22" y="${19 + i * 14}" font-family="Arial" font-size="9" fill="white">${role}</text>`)
			.join('');

		const svgOverlay = `<svg xmlns="http://www.w3.org/2000/svg" width="${imgW}" height="${imgH}">
  <rect x="4" y="4" width="100" height="${10 + Object.keys(ROLE_COLORS).length * 14 + 4}" rx="4" fill="#000000" fill-opacity="0.6"/>
  ${legendLines}
  ${svgParts.join('\n  ')}
</svg>`;

		await sharp(rawPath)
			.composite([{ input: Buffer.from(svgOverlay), top: 0, left: 0 }])
			.toFile(annotatedPath);

		// 6. Clean up the raw screenshot
		fs.unlinkSync(rawPath);

		logger.info(`Blueprint saved to: ${annotatedPath}`);

		const elementSummary = elementMap
			.map(e => `[${e.index}] ${e.role}: "${e.label}" @ (${e.x}, ${e.y})`)
			.join('\n');

		return [
			`Blueprint saved: data/screenshots/blueprint_${ts}.png`,
			`App: "${app}" — ${elementMap.length} elements annotated`,
			``,
			`Element Map:`,
			elementSummary,
			``,
			`Full JSON:`,
			JSON.stringify(elementMap, null, 2)
		].join('\n');
	}, 'Failed to annotate screen')
};
