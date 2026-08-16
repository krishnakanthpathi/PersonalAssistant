import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { optimizeImageForVision } from '../utils/mediaProcessor.js';

/**
 * GLM-OCR Task Trigger Prefix Mapping
 * Cross-attention layers are strictly conditioned on these specific prefixes.
 */
const TASK_PREFIX_MAP = {
	text: 'Text Recognition:',
	table: 'Table Recognition:',
	formula: 'Formula Recognition:',
	figure: 'Figure Recognition:'
};

/**
 * Sanitizes model output to prevent runaway autoregressive loops,
 * duplicate block echos, trailing repetitive code fences, and empty markdown tick loops.
 * @param {string} text
 * @returns {string}
 */
function sanitizeOcrOutput(text) {
	if (!text || typeof text !== 'string') return '';

	let cleaned = text
		.replace(/<\|endoftext\|>/g, '')
		.replace(/<\|im_end\|>/g, '')
		.replace(/<thinking>[\s\S]*?<\/thinking>/gi, '')
		.replace(/<think>[\s\S]*?<\/think>/gi, '')
		.trim();

	// 1. If text contains multiple consecutive identical <table>...</table> tags
	const tableMatch = cleaned.match(/<table[\s\S]*?<\/table>/i);
	if (tableMatch) {
		const firstTable = tableMatch[0];
		const afterFirstTable = cleaned.substring(cleaned.indexOf(firstTable) + firstTable.length).trim();
		if (afterFirstTable.startsWith('<table') || afterFirstTable.startsWith('```')) {
			cleaned = firstTable;
		}
	}

	// 2. If text contains repeating duplicate sections (e.g. Text + ```markdown\n + Text)
	const markdownFenceIdx = cleaned.indexOf('```markdown');
	if (markdownFenceIdx > 0) {
		const firstPart = cleaned.substring(0, markdownFenceIdx).trim();
		const secondPart = cleaned.substring(markdownFenceIdx + '```markdown'.length).replace(/```/g, '').trim();
		if (firstPart && (secondPart.includes(firstPart) || firstPart.includes(secondPart))) {
			cleaned = firstPart;
		}
	}

	// 3. General repetition cutoff: if a block of lines repeats identically
	const lines = cleaned.split('\n');
	if (lines.length >= 4) {
		for (let chunkSize = 2; chunkSize <= Math.floor(lines.length / 2); chunkSize++) {
			const chunk1 = lines.slice(0, chunkSize).join('\n');
			const chunk2 = lines.slice(chunkSize, chunkSize * 2).join('\n');
			if (chunk1.trim() === chunk2.trim() && chunk1.trim().length > 20) {
				cleaned = chunk1;
				break;
			}
		}
	}

	// 4. Remove repeating markdown code fence loops
	cleaned = cleaned.replace(/(```[\r\n]*){2,}/g, '```\n');
	cleaned = cleaned.replace(/[\r\n]+```\s*$/g, '');

	return cleaned.trim();
}

export const glmOcrTool = {
	definition: {
		name: 'glm_ocr',
		description: 'Performs high-precision Optical Character Recognition (OCR) on images or document pages using GLM-OCR. Extracts plain text, tables (Markdown/HTML), formulas (LaTeX), or figure descriptions with conditioned vision-language task triggers.',
		parameters: {
			type: 'object',
			properties: {
				filePath: {
					type: 'string',
					description: 'Absolute or relative file path to the image document on disk.'
				},
				imageBase64: {
					type: 'string',
					description: 'Optional base64 encoded image string (if filePath is not provided).'
				},
				taskType: {
					type: 'string',
					enum: ['text', 'table', 'formula', 'figure'],
					description: 'The OCR task type: "text" (plain text & layout), "table" (tables with rows/columns), "formula" (math equations in LaTeX), or "figure" (charts and figure descriptions). Defaults to "text".'
				},
				format: {
					type: 'string',
					enum: ['text', 'json', 'markdown'],
					description: 'Desired output format: "text", "json", or "markdown". When "json" is selected, native JSON mode is used. Defaults to "text".'
				},
				customPrompt: {
					type: 'string',
					description: 'Optional extra instruction or question appended after the mandatory task trigger prefix.'
				}
			},
			required: []
		}
	},

	async execute({ filePath, imageBase64, taskType = 'text', format = 'text', customPrompt }) {
		const startTime = Date.now();
		const resolvedTask = (taskType || 'text').toLowerCase();
		const prefix = TASK_PREFIX_MAP[resolvedTask] || TASK_PREFIX_MAP.text;

		let promptText = prefix;
		if (customPrompt && typeof customPrompt === 'string' && customPrompt.trim()) {
			const cleanCustom = customPrompt.trim();
			// Ensure we don't duplicate prefix if user provided it in customPrompt
			if (cleanCustom.toLowerCase().startsWith(prefix.toLowerCase())) {
				promptText = cleanCustom;
			} else {
				promptText = `${prefix} ${cleanCustom}`;
			}
		}

		try {
			let base64Image = '';
			let fileName = 'base64_image';
			let resolvedPath = null;
			let isOptimized = false;

			// 1. Resolve image source from filePath or raw imageBase64
			if (filePath) {
				resolvedPath = path.resolve(filePath);
				if (!fs.existsSync(resolvedPath)) {
					return {
						success: false,
						error: `Image file not found for GLM-OCR at path: "${filePath}"`,
						filePath
					};
				}

				const stats = fs.statSync(resolvedPath);
				if (stats.size === 0) {
					return {
						success: false,
						error: `Image file "${path.basename(filePath)}" is empty (0 bytes).`,
						filePath: resolvedPath
					};
				}

				fileName = path.basename(resolvedPath);
				const rawBuffer = fs.readFileSync(resolvedPath);

				// Automatically optimize high-res images (max 1600px, JPEG quality 85)
				const optimized = await optimizeImageForVision(rawBuffer, 1600);
				base64Image = optimized.data;
				isOptimized = optimized.optimized;
			} else if (imageBase64) {
				// Clean base64 header if present
				base64Image = imageBase64.includes(';base64,')
					? imageBase64.split(';base64,')[1]
					: imageBase64;
			} else {
				return {
					success: false,
					error: 'Either "filePath" or "imageBase64" must be provided to run GLM-OCR.'
				};
			}

			if (!base64Image) {
				return {
					success: false,
					error: 'Failed to extract valid image data for GLM-OCR.'
				};
			}

			const model = env.GLM_OCR_MODEL || 'glm-ocr:latest';
			const numCtx = env.GLM_OCR_NUM_CTX || 4096;
			const isJsonMode = (format || '').toLowerCase() === 'json';

			logger.info(`Invoking GLM-OCR (${model}) | Task: "${resolvedTask}" | Trigger: "${prefix}" | JSON Mode: ${isJsonMode} | Context: ${numCtx}`);

			const payload = {
				model,
				prompt: promptText,
				images: [base64Image],
				stream: false,
				options: {
					num_ctx: numCtx,
					temperature: 0.1,
					stop: [
						'<|endoftext|>',
						'<|im_end|>',
						'```markdown',
						'```\n```',
						'</table>\n<table',
						'</table>\n\n<table',
						'</table><table'
					]
				}
			};

			if (isJsonMode) {
				payload.format = 'json';
			}

			const ollamaEndpoint = `${env.OLLAMA_URL}/api/generate`;
			const response = await axios.post(ollamaEndpoint, payload, {
				timeout: 120000 // 2 min timeout for cold-start / large page processing
			});

			const rawResponse = response.data?.response || '';
			const sanitizedText = sanitizeOcrOutput(rawResponse);
			const latencyMs = Date.now() - startTime;

			let parsedJson = null;
			if (isJsonMode) {
				try {
					parsedJson = JSON.parse(sanitizedText);
				} catch (e) {
					logger.warn(`GLM-OCR returned non-strict JSON output in JSON mode: ${e.message}`);
				}
			}

			logger.info(`GLM-OCR completed successfully in ${latencyMs}ms (${sanitizedText.length} characters extracted).`);

			return {
				success: true,
				model,
				taskType: resolvedTask,
				taskPrefix: prefix,
				fileName,
				filePath: resolvedPath,
				extractedText: sanitizedText,
				data: parsedJson || undefined,
				characterCount: sanitizedText.length,
				wordCount: sanitizedText.trim().split(/\s+/).filter(Boolean).length,
				format: isJsonMode ? 'json' : format,
				imageOptimized: isOptimized,
				latencyMs,
				processedAt: new Date().toISOString()
			};
		} catch (error) {
			const latencyMs = Date.now() - startTime;
			logger.error(`GLM-OCR execution failed: ${error.message}`);
			return {
				success: false,
				error: `GLM-OCR processing error: ${error.message}`,
				taskType: resolvedTask,
				latencyMs
			};
		}
	}
};
