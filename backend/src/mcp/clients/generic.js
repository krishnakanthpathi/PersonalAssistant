import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { logger } from '../../utils/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendRootDir = path.resolve(__dirname, '../../..');

export function resolveMcpPath(inputPath) {
	if (typeof inputPath !== 'string' || !inputPath) return inputPath;

	let processedPath = inputPath;
	if (process.platform === 'win32') {
		if (processedPath.includes('.venv/bin/python') || processedPath.includes('.venv\\bin\\python')) {
			const winVenvPath = processedPath.replace(/\.venv[/\\]bin[/\\]python/g, '.venv\\Scripts\\python.exe');
			const absWinVenv = path.resolve(backendRootDir, winVenvPath);
			if (fs.existsSync(absWinVenv)) {
				return absWinVenv;
			}
			return 'python';
		}
	}

	// Resolve tilde home directory (~/...)
	if (processedPath.startsWith('~/') || processedPath === '~') {
		return path.join(os.homedir(), processedPath.slice(1));
	}

	// If already absolute path, return as is
	if (path.isAbsolute(processedPath)) {
		return processedPath;
	}

	// Resolve relative paths relative to backend root directory
	const resolvedFromBackend = path.resolve(backendRootDir, processedPath);
	if (
		processedPath.startsWith('./') ||
		processedPath.startsWith('../') ||
		processedPath.startsWith('mcps/') ||
		processedPath.startsWith('data/') ||
		fs.existsSync(resolvedFromBackend)
	) {
		return resolvedFromBackend;
	}

	return processedPath;
}

export class GenericStdioClient {
	constructor(name, config) {
		this.name = name;
		this.config = config;
		this.client = null;
		this.transport = null;
	}

	async connect() {
		logger.info(`Initializing Generic Stdio MCP transport for "${this.name}"...`);

		const command = resolveMcpPath(this.config.command);
		const args = (this.config.args || []).map(resolveMcpPath);

		// Resolve placeholders (e.g. YOUR_API_KEY_HERE) using process.env keys & resolve relative paths in env
		const resolvedEnv = {};
		if (this.config.env) {
			for (const [key, value] of Object.entries(this.config.env)) {
				let finalVal = value;
				if (typeof finalVal === 'string' && finalVal.startsWith('YOUR_') && process.env[key]) {
					finalVal = process.env[key];
				}
				resolvedEnv[key] = typeof finalVal === 'string' ? resolveMcpPath(finalVal) : finalVal;
			}
		}

		this.transport = new StdioClientTransport({
			command,
			args,
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
