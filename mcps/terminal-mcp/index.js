import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
	CallToolRequestSchema,
	ListToolsRequestSchema
} from '@modelcontextprotocol/sdk/types.js';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

// Initialize state
let currentCwd = process.cwd();

// Parse allowed commands from environment
const allowedCommandsString = process.env.ALLOWED_COMMANDS || 'npm,node,git,ls,echo,cat,pwd';
const allowedCommands = allowedCommandsString
	.split(',')
	.map(cmd => cmd.trim().toLowerCase())
	.filter(cmd => cmd.length > 0);

/**
 * Validates whether a command string is allowed.
 * We extract the base binary name of the command to check.
 */
function validateCommand(commandStr) {
	if (!commandStr || typeof commandStr !== 'string') {
		throw new Error('Command must be a non-empty string.');
	}
	const baseBinary = commandStr.trim().split(/\s+/)[0];
	const binaryName = path.basename(baseBinary).toLowerCase();

	const isAllowed = allowedCommands.includes(binaryName) || allowedCommands.includes(baseBinary.toLowerCase());
	if (!isAllowed) {
		throw new Error(`Command "${baseBinary}" is not allowed. Allowed commands: ${allowedCommands.join(', ')}`);
	}
}

// Create the MCP server
const server = new Server({
	name: 'terminal-mcp-server',
	version: '1.0.0'
}, {
	capabilities: {
		tools: {}
	}
});

// Implement listTools handler
server.setRequestHandler(ListToolsRequestSchema, async () => {
	return {
		tools: [
			{
				name: 'execute_command',
				description: 'Execute an allowlisted shell command in the current working directory.',
				inputSchema: {
					type: 'object',
					properties: {
						command: {
							type: 'string',
							description: 'The binary name or executable (e.g. "git", "npm", "ls").'
						},
						args: {
							type: 'array',
							items: { type: 'string' },
							description: 'Arguments to pass to the command.'
						},
						timeoutMs: {
							type: 'integer',
							description: 'Execution timeout in milliseconds (default: 30000).',
							default: 30000
						}
					},
					required: ['command']
				}
			},
			{
				name: 'change_directory',
				description: 'Change the current working directory of the terminal session.',
				inputSchema: {
					type: 'object',
					properties: {
						path: {
							type: 'string',
							description: 'Absolute or relative path to switch to.'
						}
					},
					required: ['path']
				}
			},
			{
				name: 'get_current_directory',
				description: 'Retrieve the current working directory of this terminal session.',
				inputSchema: {
					type: 'object',
					properties: {}
				}
			},
			{
				name: 'get_allowed_commands',
				description: 'Retrieve the list of allowed commands configured for this server.',
				inputSchema: {
					type: 'object',
					properties: {}
				}
			}
		]
	};
});

// Implement callTool handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
	const { name, arguments: args } = request.params;

	try {
		switch (name) {
			case 'execute_command': {
				const { command, args: cmdArgs = [], timeoutMs = 30000 } = args || {};
				validateCommand(command);

				return new Promise((resolve) => {
					console.error(`Executing command: ${command} ${cmdArgs.join(' ')} in ${currentCwd}`);

					const child = spawn(command, cmdArgs, {
						cwd: currentCwd,
						timeout: timeoutMs,
						env: { ...process.env, PAGER: 'cat' }
					});

					let stdout = '';
					let stderr = '';

					child.stdout.on('data', (data) => {
						stdout += data.toString();
					});

					child.stderr.on('data', (data) => {
						stderr += data.toString();
					});

					child.on('close', (code) => {
						const resultText = `Exit Code: ${code}\n\nSTDOUT:\n${stdout || '(no output)'}\n\nSTDERR:\n${stderr || '(no error output)'}`;
						resolve({
							content: [
								{
									type: 'text',
									text: resultText
								}
							]
						});
					});

					child.on('error', (err) => {
						resolve({
							content: [
								{
									type: 'text',
									text: `Failed to start process: ${err.message}`
								}
							],
							isError: true
						});
					});
				});
			}

			case 'change_directory': {
				const targetPath = args?.path;
				if (!targetPath) {
					throw new Error('Path argument is required.');
				}

				const resolvedPath = path.resolve(currentCwd, targetPath);
				if (!fs.existsSync(resolvedPath)) {
					throw new Error(`Directory does not exist: ${resolvedPath}`);
				}

				const stats = fs.statSync(resolvedPath);
				if (!stats.isDirectory()) {
					throw new Error(`Path is not a directory: ${resolvedPath}`);
				}

				currentCwd = resolvedPath;
				return {
					content: [
						{
							type: 'text',
							text: `Working directory changed to: ${currentCwd}`
						}
					]
				};
			}

			case 'get_current_directory': {
				return {
					content: [
						{
							type: 'text',
							text: currentCwd
						}
					]
				};
			}

			case 'get_allowed_commands': {
				return {
					content: [
						{
							type: 'text',
							text: allowedCommands.join(', ')
						}
					]
				};
			}

			default:
				throw new Error(`Tool not found: ${name}`);
		}
	} catch (error) {
		return {
			content: [
				{
					type: 'text',
					text: `Error: ${error.message}`
				}
			],
			isError: true
		};
	}
});

// Run server using stdio transport
async function run() {
	const transport = new StdioServerTransport();
	await server.connect(transport);
	console.error('Terminal MCP Server running on stdio');
}

run().catch((error) => {
	console.error('Fatal error running server:', error);
	process.exit(1);
});
