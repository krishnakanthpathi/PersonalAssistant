import path from 'path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { ListRootsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { logger } from '../../utils/logger.js';

export class FilesystemClient {
	constructor(config) {
		this.config = config;
		this.client = null;
	}

	async connect() {
		logger.info('Initializing Filesystem MCP transport...');

		// 1. Set up the transport to spawn the Filesystem MCP process
		const transport = new StdioClientTransport({
			command: this.config.command, // "npx"
			args: this.config.args,       // ["-y", "@modelcontextprotocol/server-filesystem", ...]
			env: { ...process.env, ...(this.config.env || {}) }
		});

		// 2. Initialize the JSON-RPC client with roots capability
		this.client = new Client({
			name: 'filesystem-client',
			version: '1.0.0'
		}, {
			capabilities: {
				roots: {
					listChanged: true
				}
			}
		});

		// Register roots list request handler
		this.client.setRequestHandler(ListRootsRequestSchema, async () => {
			const paths = this.config.args.filter(arg => !arg.startsWith('-') && !arg.includes('server-filesystem'));
			return {
				roots: paths.map(p => {
					const absolutePath = path.resolve(p);
					return {
						uri: `file://${absolutePath}`,
						name: path.basename(absolutePath)
					};
				})
			};
		});

		// 3. Connect to the child process via standard streams (stdio)
		await this.client.connect(transport);
		logger.info('Successfully connected to Filesystem MCP server.');
	}

	// Helper to fetch all tools (like read_file, write_file) provided by this server
	async listTools() {
		const response = await this.client.listTools();
		return response.tools || [];
	}

	// Helper to execute a tool (e.g. read_file with path argument)
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
