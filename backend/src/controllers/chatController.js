import { Agent } from '../orchestrator/agent.js';
import { logger } from '../utils/logger.js';

const agent = new Agent();

export const handleChat = async (req, res) => {
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
};
