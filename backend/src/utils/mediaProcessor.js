import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';
import { PDFParse } from 'pdf-parse';
import { logger } from './logger.js';

const execAsync = promisify(exec);

/**
 * Extracts plain text from a PDF file buffer.
 * @param {Buffer} fileBuffer
 * @returns {Promise<string>}
 */
export async function parsePdfText(fileBuffer) {
	try {
		logger.info('Parsing PDF text using open-source pdf-parse...');
		const parser = new PDFParse({ data: new Uint8Array(fileBuffer) });
		await parser.load();
		const result = await parser.getText();
		// Clean up parser references to free memory
		if (parser.destroy) {
			await parser.destroy();
		}
		const text = (result && typeof result === 'object' && typeof result.text === 'string') 
			? result.text 
			: (typeof result === 'string' ? result : '');
		return text || '';
	} catch (error) {
		logger.error(`Failed to parse PDF: ${error.message}`);
		throw new Error(`Failed to parse PDF text: ${error.message}`);
	}
}

/**
 * Extracts keyframes from a video file using ffmpeg and returns base64 image objects.
 * @param {string} videoPath - Absolute path to the video file.
 * @param {string} sessionId - Chat session ID for temp directory isolation.
 * @returns {Promise<Array<{name: string, type: string, data: string}>>}
 */
export async function extractVideoFrames(videoPath, sessionId) {
	const tempDirName = `frames_${sessionId}_${Date.now()}`;
	const tempDir = path.resolve('data/attachments', tempDirName);
	if (!fs.existsSync(tempDir)) {
		fs.mkdirSync(tempDir, { recursive: true });
	}

	try {
		// Extract 1 frame every 2 seconds, scale to max width 512, limit to 15 frames max
		const ffmpegCmd = `/opt/homebrew/bin/ffmpeg -i "${videoPath}" -vf "fps=1/2,scale=512:-1" -vframes 15 "${tempDir}/frame_%03d.png"`;
		logger.info(`Running ffmpeg frame extraction: ${ffmpegCmd}`);
		
		await execAsync(ffmpegCmd);

		if (!fs.existsSync(tempDir)) {
			throw new Error('Frames output directory does not exist');
		}

		const files = fs.readdirSync(tempDir)
			.filter(file => file.endsWith('.png'))
			.sort();

		logger.info(`Successfully extracted ${files.length} frames from video`);

		const framesBase64 = files.map(file => {
			const filePath = path.join(tempDir, file);
			const data = fs.readFileSync(filePath);
			return {
				name: file,
				type: 'image/png',
				data: data.toString('base64')
			};
		});

		// Clean up the temporary frame files
		try {
			fs.rmSync(tempDir, { recursive: true, force: true });
			logger.info(`Cleaned up temporary frames folder: ${tempDir}`);
		} catch (rmErr) {
			logger.error(`Failed to delete temp frames folder: ${rmErr.message}`);
		}

		return framesBase64;
	} catch (err) {
		logger.error(`Error during video frame extraction: ${err.message}`);
		// Attempt cleanup on failure
		try {
			if (fs.existsSync(tempDir)) {
				fs.rmSync(tempDir, { recursive: true, force: true });
			}
		} catch (cleanupErr) {}
		throw new Error(`Failed to process video: ${err.message}`);
	}
}
