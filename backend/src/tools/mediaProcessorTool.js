import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { logger } from '../utils/logger.js';
import { env } from '../config/env.js';

/**
 * Resolves the available Gemma4 model from Ollama.
 * Throws an error if Gemma4 is not available or Ollama is offline.
 */
async function resolveGemma4Model() {
	const ollamaUrl = env.OLLAMA_URL || 'http://localhost:11434';
	try {
		const res = await axios.get(`${ollamaUrl}/api/tags`, { timeout: 4000 });
		const models = res.data?.models || [];
		
		// Find model with 'gemma4' in name, model id, or family
		const gemma4Model = models.find(m => {
			const name = (m.name || '').toLowerCase();
			const model = (m.model || '').toLowerCase();
			const family = (m.details?.family || '').toLowerCase();
			const families = (m.details?.families || []).map(f => String(f).toLowerCase());
			return name.includes('gemma4') || model.includes('gemma4') || family.includes('gemma4') || families.includes('gemma4');
		});

		if (gemma4Model) {
			return gemma4Model.name || gemma4Model.model;
		}
	} catch (err) {
		logger.error(`Failed to connect to Ollama to check for Gemma4 model: ${err.message}`);
		throw new Error(`Gemma4 model is not available. Unable to connect to Ollama at ${ollamaUrl}: ${err.message}`);
	}

	throw new Error(`Gemma4 model is not available in Ollama. Please install and run Gemma4 (e.g., gemma4:31b-cloud) before processing media.`);
}

export const mediaProcessorTool = {
	definition: {
		name: 'process_media',
		description: 'Processes, inspects, OCRs, extracts text/data, and analyzes media files (images, PDFs, documents, text, code) exclusively using the Gemma4 model.',
		parameters: {
			type: 'object',
			properties: {
				filePath: {
					type: 'string',
					description: 'Absolute or relative path to the media file or attachment on disk.'
				},
				fileName: {
					type: 'string',
					description: 'Original name of the media file.'
				},
				fileType: {
					type: 'string',
					description: 'MIME type or file extension.'
				},
				prompt: {
					type: 'string',
					description: 'Optional custom instruction or question for analyzing the media.'
				}
			},
			required: ['filePath']
		}
	},
	async execute({ filePath, fileName, fileType, prompt }) {
		const startTime = Date.now();
		try {
			const resolvedPath = path.resolve(filePath);
			const displayName = fileName || path.basename(resolvedPath);

			if (!fs.existsSync(resolvedPath)) {
				return {
					success: false,
					error: `Media file does not exist at path: "${filePath}"`,
					fileName: displayName,
					filePath: filePath
				};
			}

			const stats = fs.statSync(resolvedPath);
			if (stats.size === 0) {
				return {
					success: false,
					error: `Media file "${displayName}" is empty (0 bytes).`,
					fileName: displayName,
					filePath: resolvedPath
				};
			}

			// 1. Resolve and verify Gemma4 model availability (strictly Gemma4, no other tools/models allowed)
			const gemma4Model = await resolveGemma4Model();
			const ollamaUrl = env.OLLAMA_URL || 'http://localhost:11434';

			const buffer = fs.readFileSync(resolvedPath);
			const ext = path.extname(resolvedPath).toLowerCase();
			const formattedSize = stats.size > 1048576 
				? `${(stats.size / 1048576).toFixed(2)} MB` 
				: `${(stats.size / 1024).toFixed(2)} KB`;

			const isPdf = ext === '.pdf' || fileType === 'application/pdf';
			const isImage = ext.match(/\.(png|jpg|jpeg|gif|webp|bmp|svg)$/) || (fileType && fileType.startsWith('image/'));
			const isVideo = ext.match(/\.(mp4|mov|avi|mkv|webm)$/) || (fileType && fileType.startsWith('video/'));
			const isAudio = ext.match(/\.(mp3|wav|m4a|ogg|flac|aac)$/) || (fileType && fileType.startsWith('audio/'));

			let messagesPayload = [];
			let mediaCategory = 'Document/Data';

			// 2. Image Processing via Gemma4 Vision
			if (isImage) {
				mediaCategory = 'Image Media';
				const base64Image = buffer.toString('base64');
				const userPrompt = prompt || `Analyze this image "${displayName}" in detail. Extract and transcribe all visible text (OCR), describe visual elements, charts, diagrams, objects, layout, and provide a clear summary.`;

				messagesPayload = [
					{
						role: 'user',
						content: userPrompt,
						images: [base64Image]
					}
				];
			}
			// 3. PDF Document Processing via Gemma4 (no native pdf parsers)
			else if (isPdf) {
				mediaCategory = 'PDF Document';
				// Read document raw content/text representation safely without native pdf-parse library
				const rawPdfContent = buffer.toString('utf-8');
				// Extract printable text chunks from PDF streams
				const printableChunks = rawPdfContent.replace(/[^\x20-\x7E\t\r\n]/g, ' ')
					.replace(/\s+/g, ' ')
					.trim();
				const contentSnippet = printableChunks.length > 50000 
					? printableChunks.substring(0, 50000) + '... [truncated]' 
					: printableChunks;

				const userPrompt = prompt || `You are an expert document analyzer. Analyze this PDF document "${displayName}". Extract, transcribe, structure, and summarize all text, tables, headings, and key information found in this PDF content:\n\n${contentSnippet}`;

				messagesPayload = [
					{
						role: 'user',
						content: userPrompt
					}
				];
			}
			// 4. Video / Audio Processing via Gemma4
			else if (isVideo || isAudio) {
				mediaCategory = isVideo ? 'Video Media' : 'Audio Media';
				const userPrompt = prompt || `Analyze the metadata for this ${mediaCategory} file: Name="${displayName}", Extension="${ext}", MIME="${fileType || 'unknown'}", Size=${formattedSize}. Provide an analysis and assessment.`;

				messagesPayload = [
					{
						role: 'user',
						content: userPrompt
					}
				];
			}
			// 5. Text / Code / CSV / Data Processing via Gemma4
			else {
				mediaCategory = 'Text/Data File';
				const textContent = buffer.toString('utf-8');
				const snippet = textContent.length > 60000 
					? textContent.substring(0, 60000) + '... [truncated]' 
					: textContent;

				const userPrompt = prompt || `Analyze this file "${displayName}" (format: ${ext || fileType || 'text'}). Extract the key information, transcribe content, and provide a concise summary:\n\n${snippet}`;

				messagesPayload = [
					{
						role: 'user',
						content: userPrompt
					}
				];
			}

			logger.info(`[process_media] Sending ${mediaCategory} "${displayName}" to Gemma4 model (${gemma4Model}) at ${ollamaUrl}`);

			const response = await axios.post(`${ollamaUrl}/api/chat`, {
				model: gemma4Model,
				messages: messagesPayload,
				stream: false
			}, {
				timeout: 90000 // 90 seconds timeout for large multimodal/cloud models
			});

			const analysisText = response.data?.message?.content || '';

			return {
				success: true,
				mediaType: isImage ? 'image' : (isPdf ? 'pdf' : (isVideo ? 'video' : (isAudio ? 'audio' : 'text'))),
				category: mediaCategory,
				modelUsed: gemma4Model,
				fileName: displayName,
				filePath: resolvedPath,
				fileSizeBytes: stats.size,
				fileSizeFormatted: formattedSize,
				analysis: analysisText,
				summary: analysisText,
				extractedText: analysisText,
				status: `Successfully processed ${mediaCategory.toLowerCase()} using Gemma4 model (${gemma4Model})`,
				processingDurationMs: Date.now() - startTime
			};

		} catch (err) {
			logger.error(`Error in process_media tool: ${err.message}`);
			// If Gemma4 is unavailable or fails, throw error directly and do not use any other tools
			return {
				success: false,
				error: err.response?.data?.error || err.message || 'Failed to process media with Gemma4 model',
				filePath: filePath
			};
		}
	}
};
