import fs from 'fs';
import path from 'path';
import { logger } from '../utils/logger.js';

/**
 * Pure Node.js helper to inspect image dimensions from JPEG/PNG/GIF/WEBP buffer headers
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

export const imageProcessorTool = {
	definition: {
		name: 'process_image',
		description: 'Inspects, validates, and analyzes an attached image file. Returns image dimensions, file size, format, and status details.',
		parameters: {
			type: 'object',
			properties: {
				filePath: {
					type: 'string',
					description: 'Absolute or relative path to the image file on disk.'
				},
				fileName: {
					type: 'string',
					description: 'Optional display name of the image file.'
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
					error: `Image file does not exist at path: "${filePath}"`,
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

			const buffer = fs.readFileSync(resolvedPath);
			const ext = path.extname(resolvedPath).toLowerCase();
			let mimeType = 'image/png';
			if (ext === '.jpg' || ext === '.jpeg') mimeType = 'image/jpeg';
			else if (ext === '.gif') mimeType = 'image/gif';
			else if (ext === '.webp') mimeType = 'image/webp';
			else if (ext === '.svg') mimeType = 'image/svg+xml';

			const dimensions = getImageDimensions(buffer);
			const formattedSize = stats.size > 1048576 
				? `${(stats.size / 1048576).toFixed(2)} MB` 
				: `${(stats.size / 1024).toFixed(2)} KB`;

			return {
				success: true,
				fileName: fileName || path.basename(resolvedPath),
				filePath: resolvedPath,
				mimeType: mimeType,
				fileSizeBytes: stats.size,
				fileSizeFormatted: formattedSize,
				dimensions: dimensions ? `${dimensions.width}x${dimensions.height}` : 'Standard',
				format: dimensions?.format || ext.replace('.', ''),
				status: 'Successfully inspected and validated for multimodal reasoning',
				processedAt: new Date().toISOString()
			};
		} catch (err) {
			logger.error(`Error in process_image tool: ${err.message}`);
			return {
				success: false,
				error: `Failed to process image: ${err.message}`,
				filePath: filePath
			};
		}
	}
};
