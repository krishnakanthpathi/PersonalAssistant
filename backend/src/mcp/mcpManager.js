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

		// 1. Initialize Filesystem Client if configured
		if (config.mcpServers.filesystem) {
			const fsClient = new FilesystemClient(config.mcpServers.filesystem);
			await fsClient.connect();
			this.servers.set('filesystem', fsClient);
		}

		// 2. Initialize Notion Client if configured
		if (config.mcpServers.notion) {
			const { NotionClient } = await import('./clients/notion.js');
			const notionClient = new NotionClient(config.mcpServers.notion);
			await notionClient.connect();
			this.servers.set('notion', notionClient);
		}

		// 3. Initialize Puppeteer Client if configured
		if (config.mcpServers.puppeteer) {
			const { PuppeteerClient } = await import('./clients/puppeteer.js');
			const puppeteerClient = new PuppeteerClient(config.mcpServers.puppeteer);
			await puppeteerClient.connect();
			this.servers.set('puppeteer', puppeteerClient);
		}

		// 4. Initialize Google Calendar Client if configured
		if (config.mcpServers['google-calendar']) {
			const { GoogleCalendarClient } = await import('./clients/google-calendar.js');
			const calendarClient = new GoogleCalendarClient(config.mcpServers['google-calendar']);
			await calendarClient.connect();
			this.servers.set('google-calendar', calendarClient);
		}

		// 5. Initialize YouTube Client if configured
		if (config.mcpServers.youtube) {
			const { YoutubeClient } = await import('./clients/youtube.js');
			const youtubeClient = new YoutubeClient(config.mcpServers.youtube);
			await youtubeClient.connect();
			this.servers.set('youtube', youtubeClient);
		}

		// 6. Initialize Firecrawl Client if configured
		if (config.mcpServers.firecrawl) {
			const { FirecrawlClient } = await import('./clients/firecrawl.js');
			const firecrawlClient = new FirecrawlClient(config.mcpServers.firecrawl);
			await firecrawlClient.connect();
			this.servers.set('firecrawl', firecrawlClient);
		}

		// 7. Initialize Gmail Client if configured
		if (config.mcpServers.gmail) {
			try {
				const { GmailClient } = await import('./clients/gmail.js');
				const gmailClient = new GmailClient(config.mcpServers.gmail);
				await gmailClient.connect();
				this.servers.set('gmail', gmailClient);
			} catch (err) {
				logger.warn(`Failed to initialize Gmail MCP client on boot: ${err.message}`);
			}
		}
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

		if (serverName === 'google-calendar') {
			const { GoogleCalendarClient } = await import('./clients/google-calendar.js');
			const calendarClient = new GoogleCalendarClient(serverConfig);
			await calendarClient.connect();
			this.servers.set(serverName, calendarClient);
			logger.info(`Successfully reconnected and loaded MCP server: ${serverName}`);
		} else if (serverName === 'gmail') {
			const { GmailClient } = await import('./clients/gmail.js');
			const gmailClient = new GmailClient(serverConfig);
			await gmailClient.connect();
			this.servers.set(serverName, gmailClient);
			logger.info(`Successfully reconnected and loaded MCP server: ${serverName}`);
		}
	}
}

export const mcpManager = new MCPManager();
export default mcpManager;
