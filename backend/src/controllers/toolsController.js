import { registry } from '../orchestrator/registry.js';
import { logger } from '../utils/logger.js';

export const getTools = async (req, res) => {
	try {
		const tools = await registry.getOllamaTools();
		res.json({ success: true, tools });
	} catch (error) {
		res.status(500).json({ success: false, error: error.message });
	}
};

export const searchTools = async (req, res) => {
	try {
		const { q } = req.query;
		const tools = await registry.getRelevantTools(q);
		res.json({ success: true, tools });
	} catch (error) {
		res.status(500).json({ success: false, error: error.message });
	}
};

export const testTool = async (req, res) => {
	try {
		const { name, args } = req.body;
		if (!name) throw new Error('Tool name is required');
		logger.info(`Test-executing tool: ${name} with args: ${JSON.stringify(args)}`);
		const result = await registry.callTool(name, args || {});
		res.json({ success: true, result });
	} catch (error) {
		res.json({ success: false, error: error.message });
	}
};

let activeTestProcess = null;

export const runRagTests = async (req, res) => {
	try {
		if (activeTestProcess) {
			return res.json({ success: false, error: 'A test run is already in progress.' });
		}

		logger.info('Manually triggering RAG test suite execution...');
		const { spawn } = await import('child_process');
		
		activeTestProcess = spawn('node', ['src/rag/test_rag_tools.js']);
		
		let stdout = '';
		let stderr = '';

		activeTestProcess.stdout.on('data', d => stdout += d);
		activeTestProcess.stderr.on('data', d => stderr += d);

		activeTestProcess.on('close', code => {
			activeTestProcess = null;
			res.json({
				success: code === 0,
				stdout,
				stderr,
				error: code === 0 ? null : `Process exited with code ${code}`
			});
		});

		activeTestProcess.on('error', err => {
			activeTestProcess = null;
			res.json({
				success: false,
				stdout,
				stderr,
				error: err.message
			});
		});

	} catch (error) {
		res.status(500).json({ success: false, error: error.message });
	}
};

export const stopRagTests = async (req, res) => {
	try {
		if (activeTestProcess) {
			logger.info('Stopping RAG test suite execution...');
			activeTestProcess.kill('SIGTERM');
			activeTestProcess = null;
			res.json({ success: true, message: 'Test execution stopped.' });
		} else {
			res.json({ success: false, error: 'No active test execution found to stop.' });
		}
	} catch (error) {
		res.status(500).json({ success: false, error: error.message });
	}
};
