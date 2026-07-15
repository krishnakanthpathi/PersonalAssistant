import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { logger } from '../../utils/logger.js';

export class GithubClient {
	constructor(config) {
		this.config = config;
		this.client = null;
	}

	async connect() {
		logger.info('Initializing GitHub MCP transport...');

		const transport = new StdioClientTransport({
			command: this.config.command,
			args: this.config.args,
			env: {
				...process.env,
				...(this.config.env || {})
			}
		});

		this.client = new Client({
			name: 'github-client',
			version: '1.0.0'
		}, {
			capabilities: {}
		});

		await this.client.connect(transport);
		logger.info('Successfully connected to GitHub MCP server.');
	}

	async listTools() {
		const response = await this.client.listTools();
		return response.tools || [];
	}

	async callTool(name, args, toolContext = null) {
		const options = {};
		if (toolContext) {
			options.onprogress = (progress) => {
				toolContext.reportProgress(progress);
			};
			options.resetTimeoutOnProgress = true;
		}
		return await this.client.callTool({
			name,
			arguments: args
		}, undefined, options);
	}
}
