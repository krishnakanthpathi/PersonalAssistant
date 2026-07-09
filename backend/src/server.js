/**
 * Express application & HTTP/WS bootstrapper
 */
import express from 'express';
import cors from 'cors';

import { mcpManager } from './mcp/mcpManager.js';
import { logger } from './utils/logger.js';
import { env } from './config/env.js';
import apiRoutes from './routes/api.js';

const app = express();

app.use(cors());
app.use(express.json());

// Mount API routes
app.use(apiRoutes);

async function startServer() {
	// Initialize MCP Manager & spawn the filesystem server
	await mcpManager.initialize();

	app.listen(env.PORT, () => {
		console.log(`Server running on port ${env.PORT}`);
	});
}

startServer().catch(err => {
	logger.error(`Failed to start server: ${err.message}`);
});
