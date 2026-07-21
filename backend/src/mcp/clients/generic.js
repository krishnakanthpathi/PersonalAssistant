import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { logger } from '../../utils/logger.js';

export class GenericStdioClient {
	constructor(name, config) {
		this.name = name;
		this.config = config;
		this.client = null;
		this.transport = null;
	}

	async connect() {
		logger.info(`Initializing Generic Stdio MCP transport for "${this.name}"...`);

		// Resolve placeholders (e.g. YOUR_API_KEY_HERE) using process.env keys
		const resolvedEnv = {};
		if (this.config.env) {
			for (const [key, value] of Object.entries(this.config.env)) {
				if (typeof value === 'string' && value.startsWith('YOUR_') && process.env[key]) {
					resolvedEnv[key] = process.env[key];
				} else {
					resolvedEnv[key] = value;
				}
			}
		}

		this.transport = new StdioClientTransport({
			command: this.config.command,
			args: this.config.args || [],
			env: {
				...process.env,
				...resolvedEnv
			}
		});

		this.client = new Client({
			name: `${this.name}-client`,
			version: '1.0.0'
		}, {
			capabilities: {}
		});

		await this.client.connect(this.transport);
		logger.info(`Successfully connected to Stdio MCP server: ${this.name}`);
	}

	async listTools() {
		if (!this.client) return [];
		const response = await this.client.listTools();
		return response.tools || [];
	}

	async callTool(name, args, toolContext = null) {
		if (!this.client) {
			throw new Error(`MCP client for server "${this.name}" is not connected.`);
		}
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

export class GenericSSEClient {
	constructor(name, config) {
		this.name = name;
		this.config = config;
		this.client = null;
		this.transport = null;
	}

	async connect() {
		logger.info(`Initializing Generic SSE MCP transport for "${this.name}" connecting to ${this.config.url}...`);

		this.transport = new SSEClientTransport(new URL(this.config.url));

		this.client = new Client({
			name: `${this.name}-client`,
			version: '1.0.0'
		}, {
			capabilities: {}
		});

		await this.client.connect(this.transport);
		logger.info(`Successfully connected to SSE MCP server: ${this.name}`);
	}

	async listTools() {
		if (!this.client) return [];
		const response = await this.client.listTools();
		return response.tools || [];
	}

	async callTool(name, args, toolContext = null) {
		if (!this.client) {
			throw new Error(`MCP client for server "${this.name}" is not connected.`);
		}
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
