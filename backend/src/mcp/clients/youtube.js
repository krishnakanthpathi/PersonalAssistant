import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { logger } from '../../utils/logger.js';

export class YoutubeClient {
	constructor(config) {
		this.config = config;
		this.client = null;
	}

	async connect() {
		logger.info('Initializing YouTube MCP transport...');

		// Resolve placeholders (e.g. YOUR_YOUTUBE_API_KEY_HERE) using process.env keys
		const resolvedEnv = {};
		if (this.config.env) {
			for (const [key, value] of Object.entries(this.config.env)) {
				if (typeof value === 'string' && value.startsWith('YOUR_') && process.env[key]) {
					resolvedEnv[key] = process.env[key];
				} else {
					resolvedEnv[key] = process.env[key] || value;
				}
			}
		}

		const transport = new StdioClientTransport({
			command: this.config.command,
			args: this.config.args,
			env: {
				...process.env,
				...resolvedEnv
			}
		});

		this.client = new Client({
			name: 'youtube-client',
			version: '1.0.0'
		}, {
			capabilities: {}
		});

		await this.client.connect(transport);
		logger.info('Successfully connected to YouTube MCP server.');
	}

	async listTools() {
		const response = await this.client.listTools();
		return response.tools || [];
	}

	async callTool(name, args) {
		return await this.client.callTool({
			name,
			arguments: args
		});
	}
}
