/**
 * Express application & HTTP/WS bootstrapper
 */
import express from 'express';
import cors from 'cors';

import { mcpManager } from './mcp/mcpManager.js';
import { logger } from './utils/logger.js';
import { env } from './config/env.js';
import { connectToMongoDB } from './config/mongodb.js';
import apiRoutes from './routes/api.js';
import { PersonalInfoVectorDB } from './rag/personalDb.js';
import { registry } from './orchestrator/registry.js';

import path from 'path';
import fs from 'fs';

const app = express();

app.use(cors());
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));

// Serve screenshots statically
app.use('/screenshots', express.static(path.resolve('data/screenshots')));

// Ensure downloads directory exists
const downloadsDir = path.resolve('data/downloads');
if (!fs.existsSync(downloadsDir)) {
	fs.mkdirSync(downloadsDir, { recursive: true });
}

// Serve downloads statically
app.use('/downloads', express.static(downloadsDir));

// Ensure attachments directory exists
const attachmentsDir = path.resolve('data/attachments');
if (!fs.existsSync(attachmentsDir)) {
	fs.mkdirSync(attachmentsDir, { recursive: true });
}

// Serve attachments statically
app.use('/attachments', express.static(attachmentsDir));

// Mount API routes
app.use(apiRoutes);

async function startServer() {
	// Connect to MongoDB
	await connectToMongoDB();

	// Initialize MCP Manager & spawn the filesystem server
	await mcpManager.initialize();

	// Pre-warm tool embeddings (runs after MCP so all tools are available)
	try {
		await registry.warmUpEmbeddings();
	} catch (err) {
		logger.error(`[RAG Warmup] Failed to pre-warm tool embeddings: ${err.message}`);
	}

	// Connect and synchronize personal information RAG in Chroma in the background
	try {
		const personalDb = new PersonalInfoVectorDB();
		await personalDb.connect();
		personalDb.syncFromMemoryJson().then(() => {
			logger.info('Chroma personal info RAG synchronization complete.');
		}).catch(err => {
			logger.error(`Chroma personal info RAG synchronization failed: ${err.message}`);
		});
	} catch (err) {
		logger.error(`Failed to initialize Chroma personal info RAG on startup: ${err.message}`);
	}

	app.listen(env.PORT, () => {
		console.log(`Server running on port ${env.PORT}`);
	});
}

// Start the personal assistant express backend server
startServer().catch(err => {
	logger.error(`Failed to start server: ${err.message}`);
});