/**
 * Express application & HTTP/WS bootstrapper
 */
import express from 'express';

import { mcpManager } from './mcp/mcpManager.js';
import { Agent } from "./orchestrator/agent.js";

import { logger } from './utils/logger.js';
import { platform } from 'os';
import { env } from './config/env.js';


const app = express();
const agent = new Agent();

app.use(express.json());

app.get("/", (req, res) => {

	res.json(
		{
			status: true,
			os: platform(),
			message: "Server is running"

		}
	)
})

app.post("/api/chat", async (req, res) => {
	const { prompt } = req.body;
	logger.info(`Received chat request: ${prompt}`);

	// Set headers for Server-Sent Events (SSE)
	res.setHeader('Content-Type', 'text/event-stream');
	res.setHeader('Cache-Control', 'no-cache');
	res.setHeader('Connection', 'keep-alive');
	res.setHeader('X-Accel-Buffering', 'no'); // Prevent proxy buffering

	const sendSSE = (type, content) => {
		res.write(`data: ${JSON.stringify({ type, content })}\n\n`);
	};

	try {
		const response = await agent.run(prompt, (status) => {
			sendSSE('status', status);
		});
		sendSSE('result', response);
	} catch (error) {
		logger.error(`Error in chat endpoint: ${error.message}`);
		sendSSE('error', error.message);
	} finally {
		res.end();
	}
});


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
