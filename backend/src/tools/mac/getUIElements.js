import { catchErrors } from '../../utils/errors.js';
import { logger } from '../../utils/logger.js';
import { fetchUIElements } from '../../utils/fetchUIElements.js';

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
