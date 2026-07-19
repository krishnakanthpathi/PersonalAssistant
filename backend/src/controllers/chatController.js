import { Agent } from '../orchestrator/agent.js';
import { logger } from '../utils/logger.js';
import { getDB } from '../config/mongodb.js';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { parsePdfText, extractVideoFrames } from '../utils/mediaProcessor.js';

const agent = new Agent();
const activeSessions = new Map();

export const handleChat = async (req, res) => {
	let { prompt, history, sessionId, attachments } = req.body;
	logger.info(`Received chat request: ${prompt} (session: ${sessionId}, attachments: ${attachments?.length || 0})`);

	// Ensure we have a valid sessionId
	if (!sessionId) {
		sessionId = crypto.randomUUID();
	}

	// Abort any existing execution on this session
	const existingAbort = activeSessions.get(sessionId);
	if (existingAbort) {
		existingAbort();
		activeSessions.delete(sessionId);
	}

	let isAborted = false;
	activeSessions.set(sessionId, () => {
		isAborted = true;
	});

	// Listen to client disconnect (SSE stream close) to clean up
	res.on('close', () => {
		isAborted = true;
		activeSessions.delete(sessionId);
	});

	// Set headers for Server-Sent Events (SSE)
	res.setHeader('Content-Type', 'text/event-stream');
	res.setHeader('Cache-Control', 'no-cache');
	res.setHeader('Connection', 'keep-alive');
	res.setHeader('X-Accel-Buffering', 'no'); // Prevent proxy buffering

	const sendSSE = (type, content) => {
		res.write(`data: ${JSON.stringify({ type, content })}\n\n`);
	};

	try {
		const db = getDB();
		const sessionsCollection = db.collection('chat_sessions');

		// Process attachments
		const processedAttachments = [];
		const images = [];
		let enhancedPrompt = prompt;

		if (attachments && attachments.length > 0) {
			const attachmentsDir = path.resolve('data/attachments');
			if (!fs.existsSync(attachmentsDir)) {
				fs.mkdirSync(attachmentsDir, { recursive: true });
			}

			for (const file of attachments) {
				if (!file.data) continue;
				const base64Data = file.data.includes(';base64,')
					? file.data.split(';base64,')[1]
					: file.data;
				const buffer = Buffer.from(base64Data, 'base64');

				// Generate safe unique filename
				const fileExt = path.extname(file.name) || '';
				const fileBase = path.basename(file.name, fileExt).replace(/[^a-zA-Z0-9_-]/g, '_');
				const uniqueName = `${sessionId}-${Date.now()}-${fileBase}${fileExt}`;
				const filePath = path.join(attachmentsDir, uniqueName);

				fs.writeFileSync(filePath, buffer);

				const staticUrl = `/attachments/${uniqueName}`;
				const attachmentMeta = {
					name: file.name,
					type: file.type,
					url: staticUrl,
					path: filePath
				};

				processedAttachments.push(attachmentMeta);

				// PDF Extraction
				if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
					try {
						sendSSE('status', `Parsing PDF: ${file.name}...`);
						const pdfText = await parsePdfText(buffer);
						if (pdfText.trim()) {
							enhancedPrompt += `\n\n[Content of PDF file "${file.name}":]\n---\n${pdfText}\n---`;
						}
					} catch (pdfErr) {
						logger.error(`Error parsing PDF attachment: ${pdfErr.message}`);
					}
				}
				// Image Parsing
				else if (file.type.startsWith('image/')) {
					images.push({
						type: 'image',
						data: base64Data,
						mimeType: file.type
					});
				}
				// Video Parsing (Keyframe Extraction)
				else if (file.type.startsWith('video/')) {
					try {
						sendSSE('status', `Extracting keyframes from video: ${file.name}...`);
						const frames = await extractVideoFrames(filePath, sessionId);
						for (const frame of frames) {
							images.push({
								type: 'image',
								data: frame.data,
								mimeType: frame.type
							});
						}
					} catch (videoErr) {
						logger.error(`Error processing video: ${videoErr.message}`);
					}
				}
			}
		}

		// 1. Insert or update the chat session
		const title = prompt.length > 50 ? prompt.substring(0, 47) + "..." : prompt;
		await sessionsCollection.updateOne(
			{ _id: sessionId },
			{
				$set: { updatedAt: new Date() },
				$setOnInsert: { title, createdAt: new Date(), messages: [] }
			},
			{ upsert: true }
		);

		// 2. Insert user message
		const userMessage = {
			role: 'user',
			content: prompt,
			attachments: processedAttachments,
			speech: null,
			logs: [],
			isError: false,
			createdAt: new Date()
		};
		await sessionsCollection.updateOne(
			{ _id: sessionId },
			{ $push: { messages: userMessage } }
		);

		// 3. Run agent with history, abort checks, and images
		const response = await agent.run(enhancedPrompt, history, (status) => {
			sendSSE('status', status);
		}, () => isAborted, images);

		// 4. Save assistant response
		const assistantMessage = {
			role: 'assistant',
			content: response.content || (typeof response === 'string' ? response : ''),
			speech: response.speech || null,
			logs: response.logs || [],
			ragFacts: response.ragFacts || [],
			relevantTools: response.relevantTools || [],
			isError: false,
			createdAt: new Date()
		};
		await sessionsCollection.updateOne(
			{ _id: sessionId },
			{ $push: { messages: assistantMessage } }
		);

		// Send result along with sessionId so frontend can set/update it
		sendSSE('result', { ...response, sessionId });
	} catch (error) {
		logger.error(`Error in chat endpoint: ${error.message}`);
		try {
			const db = getDB();
			const sessionsCollection = db.collection('chat_sessions');
			const errorMessage = {
				role: 'assistant',
				content: `Error: ${error.message}`,
				speech: null,
				logs: [],
				isError: true,
				createdAt: new Date()
			};
			await sessionsCollection.updateOne(
				{ _id: sessionId },
				{ $push: { messages: errorMessage } }
			);
		} catch (dbErr) {
			logger.error(`Failed to log chat error response to MongoDB: ${dbErr.message}`);
		}
		sendSSE('error', error.message);
	} finally {
		activeSessions.delete(sessionId);
		res.end();
	}
};

export const stopChat = async (req, res) => {
	const { sessionId } = req.body;
	if (!sessionId) {
		return res.status(400).json({ success: false, error: 'sessionId is required' });
	}
	const abort = activeSessions.get(sessionId);
	if (abort) {
		abort();
		activeSessions.delete(sessionId);
		return res.json({ success: true, message: 'Agent execution stopped successfully.' });
	}
	res.json({ success: false, message: 'No active agent session found to stop.' });
};

// Get all chat sessions
export const getChats = async (req, res) => {
	try {
		const db = getDB();
		const rows = await db.collection('chat_sessions')
			.find()
			.project({ _id: 1, title: 1, createdAt: 1, updatedAt: 1 })
			.sort({ updatedAt: -1 })
			.toArray();

		// Map to format matching original response
		const chats = rows.map(r => ({
			id: r._id,
			title: r.title,
			created_at: r.createdAt ? r.createdAt.toISOString() : null,
			updated_at: r.updatedAt ? r.updatedAt.toISOString() : null
		}));

		res.json({ success: true, chats });
	} catch (error) {
		logger.error(`Error fetching chat sessions: ${error.message}`);
		res.status(500).json({ success: false, error: error.message });
	}
};

// Get all messages for a specific session
export const getChatMessages = async (req, res) => {
	const { sessionId } = req.params;
	try {
		const db = getDB();
		const session = await db.collection('chat_sessions').findOne({ _id: sessionId });
		if (!session) {
			return res.json({ success: true, messages: [] });
		}

		// Map properties to match what the frontend expects
		const messages = (session.messages || []).map(m => ({
			role: m.role,
			content: m.content,
			attachments: m.attachments || [],
			speech: m.speech,
			isError: m.isError === true,
			logs: m.logs || [],
			ragFacts: m.ragFacts || [],
			relevantTools: m.relevantTools || []
		}));

		res.json({ success: true, messages });
	} catch (error) {
		logger.error(`Error fetching messages for session ${sessionId}: ${error.message}`);
		res.status(500).json({ success: false, error: error.message });
	}
};

// Delete a session
export const deleteChatSession = async (req, res) => {
	const { sessionId } = req.params;
	try {
		const db = getDB();
		await db.collection('chat_sessions').deleteOne({ _id: sessionId });
		res.json({ success: true });
	} catch (error) {
		logger.error(`Error deleting chat session ${sessionId}: ${error.message}`);
		res.status(500).json({ success: false, error: error.message });
	}
};
