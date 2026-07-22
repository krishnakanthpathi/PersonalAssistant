import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../utils/logger.js';
import { catchErrors } from '../utils/errors.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const configPath = path.join(__dirname, '../../mcp-config.json');

export class MCPManager {
	constructor() {
		this.servers = new Map();
	}

	connectServer = catchErrors(async (serverName, serverConfig) => {
		// Try custom client file first
		const clientPath = path.join(__dirname, `clients/${serverName}.js`);
		if (fs.existsSync(clientPath)) {
			const className = serverName
				.split('-')
				.map(word => word.charAt(0).toUpperCase() + word.slice(1))
				.join('') + 'Client';
			
			logger.info(`Loading custom client for "${serverName}" (${className})...`);
			const module = await import(`./clients/${serverName}.js`);
			const ClientClass = module[className];
			if (ClientClass) {
				const client = new ClientClass(serverConfig);
				await client.connect();
				this.servers.set(serverName, client);
				return;
			}
		}

		// Fallback to generic clients
		if (serverConfig.url) {
			const { GenericSSEClient } = await import('./clients/generic.js');
			const client = new GenericSSEClient(serverName, serverConfig);
			await client.connect();
			this.servers.set(serverName, client);
		} else if (serverConfig.command) {
			const { GenericStdioClient } = await import('./clients/generic.js');
			const client = new GenericStdioClient(serverName, serverConfig);
			await client.connect();
			this.servers.set(serverName, client);
		} else {
			throw new Error(`Unsupported configuration for MCP server: ${serverName}`);
		}
	}, 'Failed to connect MCP server');

	initialize = catchErrors(async () => {
		// Check if mcp config file exists
		if (!fs.existsSync(configPath)) {
			logger.warn('mcp-config.json not found, skipping MCP initialization.');
			return;
		}

		const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
		if (!config.mcpServers) return;

		// Sync Google tokens from MongoDB to local file before initializing google-calendar
		if (config.mcpServers['google-calendar']) {
			try {
				const { getDB } = await import('../config/mongodb.js');
				const db = getDB();
				const tokenDoc = await db.collection('oauth_tokens').findOne({ provider: 'google' });
				if (tokenDoc && tokenDoc.tokens) {
					const tokenPath = path.join(__dirname, '../../data/google-calendar-token.json');
					const dataDir = path.dirname(tokenPath);
					if (!fs.existsSync(dataDir)) {
						fs.mkdirSync(dataDir, { recursive: true });
					}
					fs.writeFileSync(tokenPath, JSON.stringify(tokenDoc.tokens, null, 2), 'utf8');
					logger.info('Synced Google Calendar tokens from MongoDB to local disk on boot.');
				}
			} catch (dbErr) {
				logger.warn(`Could not sync Google tokens on boot: ${dbErr.message}`);
			}
		}

		// Initialize all configured MCP servers dynamically
		for (const [serverName, serverConfig] of Object.entries(config.mcpServers)) {
			try {
				if (serverConfig.enabled !== false) {
					await this.connectServer(serverName, serverConfig);
				} else {
					logger.info(`MCP server "${serverName}" is disabled, skipping boot connection.`);
				}
			} catch (err) {
				logger.warn(`Failed to initialize MCP client "${serverName}" on boot: ${err.message}`);
			}
		}

		// Automatically sync & prune OKF RAG catalog documents for active MCP servers
		await this.syncOkfCatalog();
	}, 'Failed to initialize MCP Manager');

	/**
	 * Sync active MCP servers' tool definitions to OKF RAG catalog markdown files
	 * and prune orphaned catalog files for disconnected/deleted servers.
	 */
	async syncOkfCatalog() {
		try {
			const { OKFEngine } = await import('../okf/okfEngine.js');
			const okfDir = path.resolve(__dirname, '../../data/knowledge_catalog/tools');
			if (!fs.existsSync(okfDir)) {
				fs.mkdirSync(okfDir, { recursive: true });
			}

			// Write or update catalog documents for currently active servers
			for (const [serverName, client] of this.servers.entries()) {
				try {
					const tools = await client.listTools();
					if (tools && tools.length > 0) {
						const okfFilePath = path.join(okfDir, `mcp_${serverName}.md`);
						const toolNames = tools.map(t => t.name);
						const tags = Array.from(new Set([
							serverName,
							...serverName.split(/[-_]/),
							...toolNames.flatMap(n => n.split(/[-_]/))
						])).filter(t => t.length > 2);

						const toolsSummaryMarkdown = tools.map(t => `- **\`${t.name}\`**: ${t.description || 'No description provided.'}`).join('\n');

						const okfContent = `---
type: tool_group
title: MCP Server - ${serverName}
description: Integrated MCP server providing tools for ${serverName}.
tags: [${tags.join(', ')}]
tools: [${toolNames.join(', ')}]
timestamp: ${new Date().toISOString()}
---

# MCP Server - ${serverName}

Integrated MCP server providing tools and capabilities for ${serverName}.

### Available Tools

${toolsSummaryMarkdown}
`;
						fs.writeFileSync(okfFilePath, okfContent, 'utf8');
						logger.info(`Synced OKF catalog document for MCP server "${serverName}" at ${okfFilePath}`);
					}
				} catch (err) {
					logger.warn(`Failed to sync OKF catalog for server "${serverName}": ${err.message}`);
				}
			}

			// Prune any stale/orphaned mcp_*.md catalog files for disconnected or deleted servers
			const activeMcpFileNames = new Set(
				Array.from(this.servers.keys()).map(name => `mcp_${name}.md`)
			);
			activeMcpFileNames.add('mcp_management.md');

			const existingCatalogFiles = fs.readdirSync(okfDir);
			for (const file of existingCatalogFiles) {
				if (file.startsWith('mcp_') && file.endsWith('.md') && !activeMcpFileNames.has(file)) {
					const stalePath = path.join(okfDir, file);
					try {
						fs.unlinkSync(stalePath);
						logger.info(`Pruned stale OKF RAG catalog document: ${file}`);
					} catch (e) {
						logger.warn(`Failed to prune stale OKF file ${file}: ${e.message}`);
					}
				}
			}

			if (OKFEngine.initialized) {
				await OKFEngine.initialize();
			}
		} catch (err) {
			logger.warn(`Failed during syncOkfCatalog: ${err.message}`);
		}
	}

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
	callTool = catchErrors(async (serverName, toolName, args, toolContext = null) => {
		const client = this.servers.get(serverName);
		if (!client) {
			throw new Error(`MCP client for server "${serverName}" is not connected.`);
		}
		return await client.callTool(toolName, args, toolContext);
	}, 'Failed to execute MCP tool');

	/**
	 * Dynamic shutdown and cleanup of a specific MCP server client
	 */
	async disconnectServer(serverName) {
		const client = this.servers.get(serverName);
		if (client) {
			try {
				if (client.client) {
					await client.client.close();
				}
			} catch (err) {
				logger.warn(`Failed to close transport client for ${serverName}: ${err.message}`);
			}
			this.servers.delete(serverName);
			logger.info(`Successfully disconnected MCP server: ${serverName}`);
			await this.syncOkfCatalog();
		}
	}

	/**
	 * Reconnect/Restart a specific MCP server client
	 */
	async reconnectServer(serverName) {
		await this.disconnectServer(serverName);

		if (!fs.existsSync(configPath)) return;
		const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
		if (!config.mcpServers || !config.mcpServers[serverName]) return;

		const serverConfig = config.mcpServers[serverName];
		if (serverConfig.enabled !== false) {
			await this.connectServer(serverName, serverConfig);
			logger.info(`Successfully reconnected and loaded MCP server: ${serverName}`);
			await this.syncOkfCatalog();
		} else {
			logger.info(`MCP server "${serverName}" is disabled. Skipped connection load.`);
		}
	}
}

export const mcpManager = new MCPManager();
export default mcpManager;
