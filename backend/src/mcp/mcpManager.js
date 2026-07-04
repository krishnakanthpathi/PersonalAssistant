import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { FilesystemClient } from './clients/filesystem.js';
import { logger } from '../utils/logger.js';
import { catchErrors } from '../utils/errors.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const configPath = path.join(__dirname, '../../mcp-config.json');

export class MCPManager {
	constructor() {
		this.servers = new Map();
	}

	initialize = catchErrors(async () => {
		// Check if mcp config file exists
		if (!fs.existsSync(configPath)) {
			logger.warn('mcp-config.json not found, skipping MCP initialization.');
			return;
		}

		const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
		if (!config.mcpServers) return;

		// 1. Initialize Filesystem Client if configured
		if (config.mcpServers.filesystem) {
			const fsClient = new FilesystemClient(config.mcpServers.filesystem);
			await fsClient.connect();
			this.servers.set('filesystem', fsClient);
		}

		// (Future clients like Brave Search or GitHub can be loaded here)
	}, 'Failed to initialize MCP Manager');

	/**
	 * Aggregate tools from all registered clients
	 */
	async getTools() {
		const allTools = [];
		for (const [serverName, client] of this.servers.entries()) {
			try {
				const tools = await client.listTools();
				for (const tool of tools) {
					allTools.push({
						...tool,
						serverName // Tag the tool so the registry knows which client to call
					});
				}
			} catch (error) {
				logger.error(`Failed to list tools for ${serverName}: ${error.message}`);
			}
		}
		return allTools;
	}

	/**
	 * Route execution calls to the appropriate client
	 */
	callTool = catchErrors(async (serverName, toolName, args) => {
		const client = this.servers.get(serverName);
		if (!client) {
			throw new Error(`MCP client for server "${serverName}" is not connected.`);
		}
		return await client.callTool(toolName, args);
	}, 'Failed to execute MCP tool');
}

export const mcpManager = new MCPManager();
export default mcpManager;
