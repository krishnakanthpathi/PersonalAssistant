/**
 * Express application & HTTP/WS bootstrapper
 */
import express from 'express';
import cors from 'cors';

import { mcpManager } from './mcp/mcpManager.js';
import { Agent } from "./orchestrator/agent.js";
import { registry } from "./orchestrator/registry.js";

import { logger } from './utils/logger.js';
import { platform } from 'os';
import { env } from './config/env.js';
import { metricsService } from './utils/metrics.js';


const app = express();
const agent = new Agent();

app.use(cors())

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

app.get("/api/tools", async (req, res) => {
	try {
		const tools = await registry.getOllamaTools();
		res.json({ success: true, tools });
	} catch (error) {
		res.status(500).json({ success: false, error: error.message });
	}
});

app.get("/api/config", (req, res) => {
	res.json({
		success: true,
		provider: env.LLM_PROVIDER,
		model: env.LLM_PROVIDER === 'openai' ? env.OPENAI_MODEL : env.OLLAMA_MODEL,
		openaiBaseUrl: env.OPENAI_BASE_URL || 'default',
		port: env.PORT
	});
});

app.get("/api/metrics", (req, res) => {
	res.json({
		success: true,
		metrics: metricsService.getMetrics()
	});
});

app.delete("/api/metrics", (req, res) => {
	metricsService.clear();
	res.json({
		success: true,
		message: "Metrics cleared successfully."
	});
});

app.post("/api/chat", async (req, res) => {
	const { prompt, history } = req.body;
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
		const response = await agent.run(prompt, history, (status) => {
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
