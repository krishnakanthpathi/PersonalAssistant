import fs from 'fs';
import path from 'path';
import { logger } from '../utils/logger.js';
import { optimizeImageForVision } from '../utils/mediaProcessor.js';

export const ocrTool = {
	definition: {
		name: 'perform_ocr',
		description: 'Extracts, transcribes, and recognizes all printed or handwritten text, code, numbers, and data from an image file using the active vision model.',
		parameters: {
			type: 'object',
			properties: {
				filePath: {
					type: 'string',
					description: 'Absolute or relative path to the image file on disk to run OCR on.'
				},
				fileName: {
					type: 'string',
					description: 'Optional name of the image file.'
				}
			},
			required: ['filePath']
		}
	},
	async execute({ filePath, fileName }) {
		try {
			const resolvedPath = path.resolve(filePath);
			if (!fs.existsSync(resolvedPath)) {
				return {
					success: false,
					error: `Image file not found for OCR at path: "${filePath}"`,
					filePath: filePath
				};
			}

			const stats = fs.statSync(resolvedPath);
			if (stats.size === 0) {
				return {
					success: false,
					error: `Image file "${fileName || path.basename(filePath)}" is empty (0 bytes).`,
					filePath: resolvedPath
				};
			}

			const rawBuffer = fs.readFileSync(resolvedPath);
			
			// Automatically resize & compress high-res screenshots (e.g. 2940x1912) to safe payload size
			const optimized = await optimizeImageForVision(rawBuffer, 1600);

			const promptMsg = {
				role: 'user',
				content: 'Perform Optical Character Recognition (OCR) on this image. Extract and transcribe ALL visible text, numbers, titles, tables, labels, handwriting, or code accurately. Output only the extracted text clearly.',
				images: [
					{
						type: 'image',
						data: optimized.data,
						mimeType: optimized.mimeType
					}
				]
			};

			const displayName = fileName || path.basename(resolvedPath);
			logger.info(`Running OCR vision model on image: ${displayName} (${(optimized.optimizedSize / 1024).toFixed(1)} KB, optimized: ${optimized.optimized})...`);
			
			// Dynamic import to avoid ESM circular dependency with registry
			const { callLLM } = await import('../orchestrator/commonFunctions.js');
			const response = await callLLM([promptMsg], false, []);

			const extractedText = response.message?.content || (typeof response === 'string' ? response : '');

			return {
				success: true,
				fileName: displayName,
				filePath: resolvedPath,
				extractedText: extractedText,
				characterCount: extractedText.length,
				wordCount: extractedText.trim().split(/\s+/).filter(Boolean).length,
				imageOptimized: optimized.optimized,
				status: `Successfully extracted ${extractedText.length} characters using active vision model`,
				processedAt: new Date().toISOString()
			};
		} catch (err) {
			logger.error(`Error in perform_ocr tool: ${err.message}`);
			return {
				success: false,
				error: `OCR vision processing failed: ${err.message}`,
				filePath: filePath
			};
		}
	}
};
