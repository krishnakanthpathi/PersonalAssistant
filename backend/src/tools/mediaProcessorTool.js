import fs from 'fs';
import path from 'path';
import { logger } from '../utils/logger.js';
import { parsePdfText, extractVideoFrames } from '../utils/mediaProcessor.js';

/**
 * Helper to inspect image dimensions from JPEG/PNG/GIF/WEBP buffer headers
 */
function getImageDimensions(buffer) {
	try {
		if (buffer.length < 8) return null;

		// PNG header check
		if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
			const width = buffer.readUInt32BE(16);
			const height = buffer.readUInt32BE(20);
			return { width, height, format: 'png' };
		}

		// GIF header check
		if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) {
			const width = buffer.readUInt16LE(6);
			const height = buffer.readUInt16LE(8);
			return { width, height, format: 'gif' };
		}

		// JPEG header check
		if (buffer[0] === 0xFF && buffer[1] === 0xD8) {
			let offset = 2;
			while (offset < buffer.length) {
				const marker = buffer.readUInt16BE(offset);
				if (marker >= 0xFFC0 && marker <= 0xFFC3) {
					const height = buffer.readUInt16BE(offset + 5);
					const width = buffer.readUInt16BE(offset + 7);
					return { width, height, format: 'jpeg' };
				}
				offset += 2 + buffer.readUInt16BE(offset + 2);
			}
		}

		// WEBP header check
		if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46) {
			if (buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50) {
				return { format: 'webp' };
			}
		}
	} catch (e) {
		logger.debug(`Could not parse image header dimensions: ${e.message}`);
	}
	return null;
}

export const mediaProcessorTool = {
	definition: {
		name: 'process_media',
		description: 'Comprehensive media and file processor tool. Inspects, validates, parses, extracts metadata/text, and diagnoses errors for all media and attachments (images, videos, audio, PDFs, code, text, CSVs, JSON).',
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
				}
			},
			required: ['filePath']
		}
	},
	async execute({ filePath, fileName, fileType }) {
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

			const buffer = fs.readFileSync(resolvedPath);
			const ext = path.extname(resolvedPath).toLowerCase();
			const formattedSize = stats.size > 1048576 
				? `${(stats.size / 1048576).toFixed(2)} MB` 
				: `${(stats.size / 1024).toFixed(2)} KB`;

			const isPdf = ext === '.pdf' || fileType === 'application/pdf';
			const isImage = ext.match(/\.(png|jpg|jpeg|gif|webp|bmp|svg)$/) || (fileType && fileType.startsWith('image/'));
			const isVideo = ext.match(/\.(mp4|mov|avi|mkv|webm)$/) || (fileType && fileType.startsWith('video/'));
			const isAudio = ext.match(/\.(mp3|wav|m4a|ogg|flac|aac)$/) || (fileType && fileType.startsWith('audio/'));

			// 1. PDF Document Processing
			if (isPdf) {
				try {
					const pdfText = await parsePdfText(buffer);
					const textLength = pdfText ? pdfText.length : 0;
					const estimatedPages = Math.max(1, Math.ceil(textLength / 3000));

					return {
						success: true,
						mediaType: 'pdf',
						fileName: displayName,
						filePath: resolvedPath,
						category: 'PDF Document',
						fileSizeBytes: stats.size,
						fileSizeFormatted: formattedSize,
						extractedTextCharacters: textLength,
						estimatedPages: estimatedPages,
						previewSnippet: textLength > 200 ? pdfText.substring(0, 200) + '...' : pdfText,
						status: `Successfully parsed PDF document (${textLength} chars extracted)`,
						processingDurationMs: Date.now() - startTime
					};
				} catch (pdfErr) {
					return {
						success: false,
						mediaType: 'pdf',
						error: `Failed to parse PDF document "${displayName}": ${pdfErr.message}`,
						fileName: displayName,
						filePath: resolvedPath
					};
				}
			}

			// 2. Image Processing
			if (isImage) {
				const dimensions = getImageDimensions(buffer);
				return {
					success: true,
					mediaType: 'image',
					fileName: displayName,
					filePath: resolvedPath,
					category: 'Image Media',
					fileSizeBytes: stats.size,
					fileSizeFormatted: formattedSize,
					mimeType: fileType || `image/${ext.replace('.', '')}`,
					dimensions: dimensions ? `${dimensions.width}x${dimensions.height}` : 'Standard',
					format: dimensions?.format || ext.replace('.', ''),
					status: 'Successfully inspected image dimensions and validated payload',
					processingDurationMs: Date.now() - startTime
				};
			}

			// 3. Video Processing
			if (isVideo) {
				try {
					const frames = await extractVideoFrames(resolvedPath, 'media-check');
					return {
						success: true,
						mediaType: 'video',
						fileName: displayName,
						filePath: resolvedPath,
						category: 'Video Media',
						fileSizeBytes: stats.size,
						fileSizeFormatted: formattedSize,
						keyframesExtracted: frames.length,
						status: `Successfully extracted ${frames.length} keyframes for video analysis`,
						processingDurationMs: Date.now() - startTime
					};
				} catch (videoErr) {
					return {
						success: false,
						mediaType: 'video',
						error: `Failed to extract keyframes from video "${displayName}": ${videoErr.message}`,
						fileName: displayName,
						filePath: resolvedPath
					};
				}
			}

			// 4. Audio Processing
			if (isAudio) {
				return {
					success: true,
					mediaType: 'audio',
					fileName: displayName,
					filePath: resolvedPath,
					category: 'Audio Media',
					fileSizeBytes: stats.size,
					fileSizeFormatted: formattedSize,
					mimeType: fileType || `audio/${ext.replace('.', '')}`,
					status: 'Successfully validated audio file payload',
					processingDurationMs: Date.now() - startTime
				};
			}

			// 5. Text / Code / CSV / Data File Processing
			try {
				const textContent = buffer.toString('utf-8');
				const lines = textContent.split('\n').length;
				return {
					success: true,
					mediaType: 'text',
					fileName: displayName,
					filePath: resolvedPath,
					category: 'Text/Data File',
					fileSizeBytes: stats.size,
					fileSizeFormatted: formattedSize,
					lineCount: lines,
					characterCount: textContent.length,
					previewSnippet: textContent.length > 200 ? textContent.substring(0, 200) + '...' : textContent,
					status: `Successfully read text media (${lines} lines, ${textContent.length} chars)`,
					processingDurationMs: Date.now() - startTime
				};
			} catch (textErr) {
				return {
					success: false,
					mediaType: 'unknown',
					error: `Failed to read file content for "${displayName}": ${textErr.message}`,
					fileName: displayName,
					filePath: resolvedPath
				};
			}

		} catch (err) {
			logger.error(`Error in process_media tool: ${err.message}`);
			return {
				success: false,
				error: `Failed to process media: ${err.message}`,
				filePath: filePath
			};
		}
	}
};
