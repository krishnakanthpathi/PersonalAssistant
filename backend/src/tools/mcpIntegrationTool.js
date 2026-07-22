import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { mcpManager } from '../mcp/mcpManager.js';
import { OKFEngine } from '../okf/okfEngine.js';
import { catchErrors } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const configPath = path.join(__dirname, '../../mcp-config.json');
const rootMcpsDir = path.resolve(__dirname, '../../../mcps');
const backendMcpsDir = path.resolve(__dirname, '../../mcps');
const backendNodeModules = path.resolve(__dirname, '../../node_modules');

export const integrateMcpServerTool = {
	definition: {
		name: 'integrate_mcp_server',
		description: 'Integrates, creates, and runs an MCP (Model Context Protocol) server. Supports online runnable servers (SSE/HTTP URLs, npx/uvx packages) and local custom MCP servers. Creates folders in mcps/, writes code files, updates mcp-config.json, hot-reloads the connection, auto-generates OKF catalog documents for RAG, and lists newly available tools.',
		parameters: {
			type: 'object',
			properties: {
				name: {
					type: 'string',
					description: 'Unique name/identifier for the MCP server (e.g., "sqlite", "weather-mcp", "custom-calculator").'
				},
				type: {
					type: 'string',
					description: 'Transport protocol type: "stdio" for local process / npx commands, or "sse" for online runnable remote URLs.',
					enum: ['stdio', 'sse'],
					default: 'stdio'
				},
				url: {
					type: 'string',
					description: 'The remote SSE/HTTP endpoint URL if type is "sse".'
				},
				command: {
					type: 'string',
					description: 'Command to run the stdio MCP server (e.g. "npx", "node", "python", "uvx").'
				},
				args: {
					type: 'array',
					items: { type: 'string' },
					description: 'Command line arguments (e.g. ["-y", "@modelcontextprotocol/server-sqlite"]).'
				},
				env: {
					type: 'object',
					description: 'Key-value environment variables needed by the MCP server.'
				},
				localCode: {
					type: 'object',
					description: 'Optional configuration to create custom local MCP server code files on disk.',
					properties: {
						filename: { type: 'string', description: 'Main server file name (e.g. "index.js" or "server.py").' },
						content: { type: 'string', description: 'Full source code content for the MCP server.' },
						packageJson: { type: 'string', description: 'Optional package.json file content if Node.js server.' },
						requirements: { type: 'string', description: 'Optional requirements.txt file content if Python server.' }
					}
				}
			},
			required: ['name']
		}
	},

	execute: catchErrors(async ({ name, type = 'stdio', url, command, args = [], env = {}, localCode = null }) => {
		if (!name || typeof name !== 'string' || !name.trim()) {
			throw new Error('MCP server "name" is required.');
		}

		const cleanName = name.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-');
		logger.info(`LLM executing integrate_mcp_server for "${cleanName}" (type: ${type})`);

		// Ensure root mcps and backend/mcps directories exist
		if (!fs.existsSync(rootMcpsDir)) {
			fs.mkdirSync(rootMcpsDir, { recursive: true });
		}
		if (!fs.existsSync(backendMcpsDir)) {
			fs.mkdirSync(backendMcpsDir, { recursive: true });
		}

		let finalCommand = command;
		let finalArgs = Array.isArray(args) ? [...args] : [];

		// Handle custom local code creation if provided
		if (localCode && (localCode.content || localCode.filename)) {
			const serverFolder = path.join(rootMcpsDir, cleanName);
			if (!fs.existsSync(serverFolder)) {
				fs.mkdirSync(serverFolder, { recursive: true });
			}

			// Symlink node_modules so local JS MCP server can access @modelcontextprotocol/sdk
			const localNodeModules = path.join(serverFolder, 'node_modules');
			if (!fs.existsSync(localNodeModules) && fs.existsSync(backendNodeModules)) {
				try {
					fs.symlinkSync(backendNodeModules, localNodeModules, 'dir');
					logger.info(`Symlinked node_modules to ${localNodeModules}`);
				} catch (symErr) {
					logger.warn(`Could not symlink node_modules: ${symErr.message}`);
				}
			}

			const mainFilename = localCode.filename || (cleanName.endsWith('.py') ? 'server.py' : 'index.js');
			const filePath = path.join(serverFolder, mainFilename);
			
			if (localCode.content) {
				fs.writeFileSync(filePath, localCode.content, 'utf8');
				logger.info(`Created local MCP server file at: ${filePath}`);
			}

			if (localCode.packageJson) {
				const pkgPath = path.join(serverFolder, 'package.json');
				const pkgContent = typeof localCode.packageJson === 'object' ? JSON.stringify(localCode.packageJson, null, 2) : localCode.packageJson;
				fs.writeFileSync(pkgPath, pkgContent, 'utf8');
			}

			if (localCode.requirements) {
				const reqPath = path.join(serverFolder, 'requirements.txt');
				fs.writeFileSync(reqPath, localCode.requirements, 'utf8');
			}

			// Infer default command/args if not explicitly provided
			if (!finalCommand) {
				if (mainFilename.endsWith('.py')) {
					finalCommand = 'python3';
					finalArgs = [filePath];
				} else {
					finalCommand = 'node';
					finalArgs = [filePath];
				}
			}
		}

		// Validate config before writing
		if (type === 'sse') {
			if (!url) {
				throw new Error('URL is required for SSE transport type.');
			}
		} else {
			if (!finalCommand) {
				throw new Error('Command is required for stdio transport type (e.g. npx, node, python).');
			}
		}

		// Read existing mcp-config.json
		let configData = { mcpServers: {} };
		if (fs.existsSync(configPath)) {
			try {
				configData = JSON.parse(fs.readFileSync(configPath, 'utf8'));
			} catch (e) {
				logger.warn(`Failed to parse existing mcp-config.json, creating clean config: ${e.message}`);
			}
		}
		if (!configData.mcpServers) configData.mcpServers = {};

		// Build new server configuration
		const newServerConfig = {
			enabled: true
		};

		if (type === 'sse') {
			newServerConfig.url = url;
		} else {
			newServerConfig.command = finalCommand;
			newServerConfig.args = finalArgs;
			
			const envVars = { ...env };
			if (finalCommand === 'node' || finalCommand === 'npx' || finalCommand.endsWith('/node')) {
				envVars.NODE_PATH = envVars.NODE_PATH 
					? `${envVars.NODE_PATH}:${backendNodeModules}`
					: backendNodeModules;
			}
			if (Object.keys(envVars).length > 0) {
				newServerConfig.env = envVars;
			}
		}

		configData.mcpServers[cleanName] = newServerConfig;

		// Save updated mcp-config.json
		fs.writeFileSync(configPath, JSON.stringify(configData, null, 2), 'utf8');
		logger.info(`Updated mcp-config.json with server "${cleanName}". Hot-reloading client...`);

		// Reconnect/start the MCP server live
		await mcpManager.reconnectServer(cleanName);

		// Verify connection and retrieve tools
		const client = mcpManager.servers.get(cleanName);
		let tools = [];
		if (client) {
			tools = await client.listTools();
		}

		// Auto-generate OKF Catalog document if tools exist & reload OKFEngine
		if (tools.length > 0) {
			try {
				const okfDir = path.resolve(__dirname, '../../data/knowledge_catalog/tools');
				if (!fs.existsSync(okfDir)) {
					fs.mkdirSync(okfDir, { recursive: true });
				}

				const okfFilePath = path.join(okfDir, `mcp_${cleanName}.md`);
				const toolNames = tools.map(t => t.name);
				const tags = Array.from(new Set([
					cleanName,
					...cleanName.split(/[-_]/),
					...toolNames.flatMap(n => n.split(/[-_]/))
				])).filter(t => t.length > 2);

				const toolsSummaryMarkdown = tools.map(t => `- **\`${t.name}\`**: ${t.description || 'No description provided.'}`).join('\n');

				const okfContent = `---
type: tool_group
title: MCP Server - ${cleanName}
description: Integrated MCP server providing tools for ${cleanName}.
tags: [${tags.join(', ')}]
tools: [${toolNames.join(', ')}]
timestamp: ${new Date().toISOString()}
---

# MCP Server - ${cleanName}

Integrated MCP server providing tools and capabilities for ${cleanName}.

### Available Tools

${toolsSummaryMarkdown}
`;

				fs.writeFileSync(okfFilePath, okfContent, 'utf8');
				logger.info(`Generated OKF catalog document at ${okfFilePath}`);

				// Re-initialize OKFEngine so new catalog documents are indexed immediately
				await OKFEngine.initialize();
				logger.info('Re-initialized OKFEngine with new catalog document.');
			} catch (okfErr) {
				logger.warn(`Failed to auto-generate OKF catalog document: ${okfErr.message}`);
			}
		}

		return JSON.stringify({
			success: true,
			message: `MCP server "${cleanName}" integrated, registered in OKF RAG, and started successfully!`,
			serverName: cleanName,
			type,
			status: client ? 'connected' : 'disconnected',
			toolsCount: tools.length,
			tools: tools.map(t => ({ name: t.name, description: t.description }))
		}, null, 2);
	}, 'Failed to integrate MCP server')
};
