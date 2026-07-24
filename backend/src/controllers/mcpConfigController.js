import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { mcpManager } from '../mcp/mcpManager.js';
import { logger } from '../utils/logger.js';
import { catchErrors } from '../utils/errors.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const configPath = path.join(__dirname, '../../mcp-config.json');

const getMcpConfigData = () => {
	if (!fs.existsSync(configPath)) {
		return { mcpServers: {} };
	}
	return JSON.parse(fs.readFileSync(configPath, 'utf8'));
};

const saveMcpConfigData = (data) => {
	fs.writeFileSync(configPath, JSON.stringify(data, null, 2), 'utf8');
};

/**
 * GET /api/mcp/config
 * Retrieves the current configured servers and their connection statuses
 */
export const getMcpConfig = catchErrors(async (req, res) => {
	const config = getMcpConfigData();
	const servers = [];

	for (const [name, cfg] of Object.entries(config.mcpServers || {})) {
		const isConnected = mcpManager.servers.has(name);
		let toolsCount = 0;
		if (isConnected) {
			try {
				const client = mcpManager.servers.get(name);
				const tools = await client.listTools();
				toolsCount = tools.length;
			} catch (err) {
				logger.warn(`Failed to list tools for ${name} during status fetch: ${err.message}`);
			}
		}

		servers.push({
			name,
			type: cfg.url ? 'sse' : 'stdio',
			url: cfg.url || '',
			command: cfg.command || '',
			args: cfg.args || [],
			env: cfg.env || {},
			enabled: cfg.enabled !== false,
			status: isConnected ? 'connected' : (cfg.enabled === false ? 'disabled' : 'disconnected'),
			toolsCount
		});
	}

	res.json({ servers });
}, 'Failed to get MCP config');

/**
 * POST /api/mcp/config
 * Adds or updates an MCP server configuration, and connects/reconnects it dynamically
 */
export const saveMcpServer = catchErrors(async (req, res) => {
	const { name, type, url, command, args, env, enabled } = req.body;

	if (!name) {
		return res.status(400).json({ error: 'Server name is required' });
	}

	const config = getMcpConfigData();
	if (!config.mcpServers) {
		config.mcpServers = {};
	}

	// Build the new config object
	const serverConfig = {};
	serverConfig.enabled = enabled !== false;

	if (type === 'sse') {
		if (!url) {
			return res.status(400).json({ error: 'SSE URL is required for SSE type' });
		}
		serverConfig.url = url;
	} else {
		if (!command) {
			return res.status(400).json({ error: 'Command is required for stdio type' });
		}
		serverConfig.command = command;
		serverConfig.args = args || [];
		serverConfig.env = env || {};
	}

	config.mcpServers[name] = serverConfig;
	saveMcpConfigData(config);

	logger.info(`Saved config for MCP server "${name}". Connecting dynamically...`);

	// Hot reload the client in background
	try {
		await mcpManager.reconnectServer(name);
		res.json({ success: true, message: `Server "${name}" saved and status updated successfully.` });
	} catch (err) {
		logger.error(`Failed to dynamically connect MCP server "${name}": ${err.message}`);
		res.status(500).json({ error: `Config saved, but failed to connect: ${err.message}` });
	}
}, 'Failed to save MCP server');

/**
 * POST /api/mcp/config/:name/toggle
 * Enabes or disables an MCP server
 */
export const toggleMcpServer = catchErrors(async (req, res) => {
	const { name } = req.params;
	const { enabled } = req.body;

	if (enabled === undefined) {
		return res.status(400).json({ error: 'enabled state is required' });
	}

	const config = getMcpConfigData();
	if (!config.mcpServers || !config.mcpServers[name]) {
		return res.status(404).json({ error: `Server "${name}" not found in config` });
	}

	config.mcpServers[name].enabled = !!enabled;
	saveMcpConfigData(config);

	logger.info(`Toggled MCP server "${name}" to enabled=${enabled}. Updating connection dynamically...`);

	try {
		if (enabled) {
			await mcpManager.reconnectServer(name);
			res.json({ success: true, message: `Server "${name}" enabled and connected successfully.` });
		} else {
			await mcpManager.disconnectServer(name);
			res.json({ success: true, message: `Server "${name}" disabled and disconnected successfully.` });
		}
	} catch (err) {
		logger.error(`Failed to dynamically toggle state for MCP server "${name}": ${err.message}`);
		res.status(500).json({ error: `Toggled configuration saved, but failed to apply: ${err.message}` });
	}
}, 'Failed to toggle MCP server state');

/**
 * DELETE /api/mcp/config/:name
 * Removes a server from mcp-config.json and disconnects it
 */
export const deleteMcpServer = catchErrors(async (req, res) => {
	const { name } = req.params;

	if (!name) {
		return res.status(400).json({ error: 'Server name is required' });
	}

	const config = getMcpConfigData();
	if (!config.mcpServers || !config.mcpServers[name]) {
		return res.status(404).json({ error: `Server "${name}" not found in config` });
	}

	delete config.mcpServers[name];
	saveMcpConfigData(config);

	logger.info(`Deleted config for MCP server "${name}". Disconnecting dynamically...`);

	await mcpManager.disconnectServer(name);
	res.json({ success: true, message: `Server "${name}" deleted and disconnected successfully.` });
}, 'Failed to delete MCP server');

/**
 * POST /api/mcp/config/:name/reconnect
 * Manually restarts/reconnects a server
 */
export const reconnectMcpServer = catchErrors(async (req, res) => {
	const { name } = req.params;

	if (!name) {
		return res.status(400).json({ error: 'Server name is required' });
	}

	const config = getMcpConfigData();
	if (!config.mcpServers || !config.mcpServers[name]) {
		return res.status(404).json({ error: `Server "${name}" not found in config` });
	}

	logger.info(`Manual reconnect requested for MCP server "${name}"...`);

	try {
		await mcpManager.reconnectServer(name);
		res.json({ success: true, message: `Server "${name}" reconnected successfully.` });
	} catch (err) {
		logger.error(`Failed to reconnect MCP server "${name}": ${err.message}`);
		res.status(500).json({ error: `Failed to reconnect: ${err.message}` });
	}
}, 'Failed to reconnect MCP server');

/**
 * POST /api/mcp/config/sync
 * Reads mcp-config.json, connects/disconnects servers to match config, and auto-generates OKF RAG catalog docs
 */
export const syncMcpConfig = catchErrors(async (req, res) => {
	logger.info('Manual MCP config sync requested via API...');
	await mcpManager.syncConfigState();
	res.json({ success: true, message: 'MCP config and Knowledge Catalog synchronized successfully.' });
}, 'Failed to sync MCP configuration');
