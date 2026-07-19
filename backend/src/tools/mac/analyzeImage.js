import fs from 'fs';
import path from 'path';
import { catchErrors } from '../../utils/errors.js';
import { logger } from '../../utils/logger.js';
import { callLLM } from '../../orchestrator/commonFunctions.js';

function getMimeType(filePath) {
	const ext = path.extname(filePath).toLowerCase();
	if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
	if (ext === '.png') return 'image/png';
	if (ext === '.gif') return 'image/gif';
	if (ext === '.webp') return 'image/webp';
	return 'application/octet-stream';
}

export const analyzeImageTool = {
	definition: {
		name: 'analyze_image',
		description: 'Analyzes a local image file (such as a screenshot or saved photo) using the configured vision model for a given question or instruction.',
		parameters: {
			type: 'object',
			properties: {
				imagePath: {
					type: 'string',
					description: 'The absolute path to the local image file to analyze (e.g. "/Users/krishnakanth/Desktop/screenshot.png").'
				},
				prompt: {
					type: 'string',
					description: 'The specific question or instruction for the vision model about the image content (e.g. "What is written in this message?", "Does the image show any error?").'
				}
			},
			required: ['imagePath', 'prompt']
		}
	},

	execute: catchErrors(async ({ imagePath, prompt }) => {
		if (!imagePath) throw new Error('imagePath is required');
		if (!prompt) throw new Error('prompt is required');

		const resolvedPath = path.resolve(imagePath);
		if (!fs.existsSync(resolvedPath)) {
			throw new Error(`Image file not found at path: ${resolvedPath}`);
		}

		logger.info(`analyze_image: Reading image file at ${resolvedPath}`);
		const fileBuffer = fs.readFileSync(resolvedPath);
		const mimeType = getMimeType(resolvedPath);
		const base64Data = fileBuffer.toString('base64');

		logger.info(`analyze_image: Sending vision analysis query for model...`);
		const messages = [
			{
				role: 'user',
				content: prompt,
				images: [{
					mimeType: mimeType,
					data: base64Data
				}]
			}
		];

		const response = await callLLM(messages, false, []);
		const resultText = response.message?.content || (typeof response === 'string' ? response : '');

		logger.info(`analyze_image: Finished vision analysis.`);
		return resultText;
	})
};
