import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { logger } from '../utils/logger.js';
import { catchErrors } from '../utils/errors.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '../../.env');

/**
 * GET /api/env
 * Reads the current .env file content
 */
export const getEnvConfig = catchErrors(async (req, res) => {
	if (!fs.existsSync(envPath)) {
		return res.json({ content: '' });
	}
	const content = fs.readFileSync(envPath, 'utf8');
	res.json({ content });
}, 'Failed to get env configuration');

/**
 * POST /api/env
 * Saves .env file content and hot-updates process.env
 */
export const saveEnvConfig = catchErrors(async (req, res) => {
	const { content } = req.body;

	if (content === undefined) {
		return res.status(400).json({ error: 'Env content is required' });
	}

	fs.writeFileSync(envPath, content, 'utf8');
	logger.info('Successfully updated backend .env file. Re-parsing environment variables...');

	// Hot reload env variables into process.env
	try {
		const parsed = dotenv.parse(content);
		for (const [key, value] of Object.entries(parsed)) {
			process.env[key] = value;
		}
		logger.info('Environment variables successfully hot-reloaded into process.env.');
		res.json({ success: true, message: '.env file saved and environment reloaded successfully.' });
	} catch (err) {
		logger.error(`Failed to parse updated .env file: ${err.message}`);
		res.status(500).json({ error: `Config saved, but failed to parse: ${err.message}` });
	}
}, 'Failed to save env configuration');
