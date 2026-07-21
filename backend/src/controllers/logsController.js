import fs from 'fs';
import path from 'path';
import { logEmitter } from '../utils/logger.js';

function getLastLines(filePath, maxLines = 150) {
	try {
		if (!fs.existsSync(filePath)) return [];
		const stat = fs.statSync(filePath);
		const size = stat.size;

		// Read at most 128KB from the end to be safe for 150 lines
		const bufferSize = Math.min(size, 131072);
		if (bufferSize === 0) return [];

		const buffer = Buffer.alloc(bufferSize);
		const fd = fs.openSync(filePath, 'r');
		fs.readSync(fd, buffer, 0, bufferSize, size - bufferSize);
		fs.closeSync(fd);

		const content = buffer.toString('utf-8');
		const lines = content.split('\n');

		// Discard first line if it's incomplete
		if (size > bufferSize && lines.length > 1) {
			lines.shift();
		}

		return lines
			.map(line => line.trim())
			.filter(Boolean)
			.slice(-maxLines);
	} catch (err) {
		console.error('Error reading last lines of log:', err);
		return [];
	}
}

export const streamLogs = (req, res) => {
	// Set headers for Server-Sent Events (SSE)
	res.setHeader('Content-Type', 'text/event-stream');
	res.setHeader('Cache-Control', 'no-cache');
	res.setHeader('Connection', 'keep-alive');
	res.setHeader('X-Accel-Buffering', 'no'); // Prevent proxy buffering

	const sendEvent = (type, data) => {
		res.write(`data: ${JSON.stringify({ type, data })}\n\n`);
	};

	// 1. Send recent log history
	const logFilePath = path.resolve('data/logs/combined.log');
	const lastLines = getLastLines(logFilePath, 150);

	const historyLogs = [];
	for (const line of lastLines) {
		try {
			const parsed = JSON.parse(line);
			historyLogs.push(parsed);
		} catch (e) {
			// If it's not JSON, send it as a plain log info object
			historyLogs.push({
				level: 'info',
				message: line,
				timestamp: new Date().toISOString()
			});
		}
	}

	sendEvent('history', historyLogs);

	// 2. Listen to real-time logs
	const onLog = (info) => {
		sendEvent('log', info);
	};

	logEmitter.on('log', onLog);

	// Clean up when client disconnects
	res.on('close', () => {
		logEmitter.off('log', onLog);
		res.end();
	});
};
