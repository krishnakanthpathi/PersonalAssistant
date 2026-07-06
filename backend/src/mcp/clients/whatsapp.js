import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';

export class WhatsAppClient {
	constructor(config) {
		this.config = config;
		this.client = null;
	}

	async connect() {
		logger.info('Initializing WhatsApp MCP transport...');

		const transport = new StdioClientTransport({
			command: this.config.command,
			args: this.config.args,
			env: {
				...process.env,
				WHATSAPP_TARGET_NUMBER: env.WHATSAPP_TARGET_NUMBER,
				WHATSAPP_ALLOWED_NUMBERS: env.WHATSAPP_ALLOWED_NUMBERS
			}
		});

		this.client = new Client({
			name: 'whatsapp-client',
			version: '1.0.0'
		}, {
			capabilities: {}
		});

		await this.client.connect(transport);
		logger.info('Successfully connected to WhatsApp MCP server.');
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
