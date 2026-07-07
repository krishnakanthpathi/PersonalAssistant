import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';
import sharp from 'sharp';
import { catchErrors } from '../../utils/errors.js';
import { logger } from '../../utils/logger.js';
import { fetchUIElements } from '../../utils/fetchUIElements.js';

const execAsync = promisify(exec);

const ROLE_COLORS = {
	'button':      '#FF4757',
	'text field':  '#2ED573',
	'text area':   '#1E90FF',
	'link':        '#FFA502',
	'static text': '#A29BFE',
	'check box':   '#00CEC9',
	'menu button': '#FD79A8',
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
		const targetDir = path.resolve('data/screenshots');
		if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

		const ts = Date.now();
		const rawPath = path.join(targetDir, `raw_${ts}.png`);
		const annotatedPath = path.join(targetDir, `blueprint_${ts}.png`);

		// Run screenshot and element fetch in parallel for speed
		logger.info('Capturing screenshot and fetching UI elements in parallel...');
		const [, { app, elements }] = await Promise.all([
			execAsync(`screencapture -x "${rawPath}"`),
			fetchUIElements().catch(err => {
				logger.warn(`Could not fetch UI elements: ${err.message}`);
				return { app: 'Unknown', elements: [] };
			})
		]);

		logger.info(`Fetched ${elements.length} UI elements from "${app}"`);

		const limited = elements.slice(0, max_elements);
		const elementMap = limited.map((el, i) => ({
			index: i + 1,
			role: el.role,
			label: el.label || '(unlabeled)',
			x: el.x,
			y: el.y
		}));

		// Build SVG overlay
		const svgParts = [];
		for (const el of elementMap) {
			const color = ROLE_COLORS[el.role] || DEFAULT_COLOR;
			const shortLabel = `${el.index}. ${el.label}`.substring(0, 28);
			const lx = el.x + 10;
			const ly = el.y - 6;
			const labelWidth = Math.min(shortLabel.length * 6.5 + 8, 220);
			svgParts.push(`<circle cx="${el.x}" cy="${el.y}" r="9" fill="${color}" fill-opacity="0.88" stroke="white" stroke-width="1.5"/>`);
			svgParts.push(`<text x="${el.x}" y="${el.y + 4}" text-anchor="middle" font-family="SF Pro, Arial, sans-serif" font-size="9" font-weight="bold" fill="white">${el.index}</text>`);
			svgParts.push(`<rect x="${lx}" y="${ly - 11}" width="${labelWidth}" height="14" rx="3" fill="#1a1a1a" fill-opacity="0.72"/>`);
			svgParts.push(`<text x="${lx + 4}" y="${ly}" font-family="SF Pro, Arial, sans-serif" font-size="9" fill="${color}">${shortLabel}</text>`);
		}

		const meta = await sharp(rawPath).metadata();
		const { width: imgW, height: imgH } = meta;

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
