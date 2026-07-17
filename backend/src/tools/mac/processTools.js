import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import { catchErrors } from '../../utils/errors.js';
import { logger } from '../../utils/logger.js';

const execAsync = promisify(exec);

// Allowed commands for process execution
const DEFAULT_ALLOWED_PROCESSES = [
	'git', 'rg', 'gh', 'fd', 'python3', 'node', 'npm', 'npx', 
	'swift', 'swiftc', 'osascript', 'cupsfilter', 'qlmanage', 
	'shortcuts', 'open', 'screencapture', 'cat', 'ls', 'echo', 'ps'
];

const ALLOWED_PROCESSES = process.env.MAC_MCP_PROCESS_ALLOW
	? process.env.MAC_MCP_PROCESS_ALLOW.split(':').concat(DEFAULT_ALLOWED_PROCESSES)
	: DEFAULT_ALLOWED_PROCESSES;

function checkCommandAllowed(command) {
	const baseName = command.trim().split(/\s+/)[0];
	const simpleName = baseName.split('/').pop();
	const allowed = ALLOWED_PROCESSES.includes(simpleName) || ALLOWED_PROCESSES.includes(baseName);
	if (!allowed) {
		throw new Error(`Command "${baseName}" is not in the allow-listed processes.`);
	}
}

// Global registry of async process sessions
const asyncSessions = new Map();

export const processRunTool = {
	definition: {
		name: 'process_run',
		description: 'Run an allow-listed process synchronously (capped output + timeout).',
		parameters: {
			type: 'object',
			properties: {
				command: { type: 'string', description: 'The command binary/executable name (e.g. "git").' },
				args: { type: 'array', items: { type: 'string' }, description: 'Array of command arguments.' },
				timeoutMs: { type: 'integer', default: 10000, description: 'Timeout in milliseconds.' }
			},
			required: ['command']
		}
	},
	execute: catchErrors(async ({ command, args = [], timeoutMs = 10000 }) => {
		checkCommandAllowed(command);
		logger.info(`Running process sync: ${command} ${args.join(' ')}`);

		return new Promise((resolve, reject) => {
			const child = spawn(command, args, { timeout: timeoutMs, env: { ...process.env, PAGER: 'cat' } });
			let stdout = '';
			let stderr = '';

			child.stdout.on('data', d => stdout += d);
			child.stderr.on('data', d => stderr += d);

			child.on('close', code => {
				const output = `Exit Code: ${code}\nSTDOUT:\n${stdout.substring(0, 10000)}\nSTDERR:\n${stderr.substring(0, 10000)}`;
				resolve(output);
			});

			child.on('error', err => {
				reject(err);
			});
		});
	}, 'Failed to run process')
};

export const processStartTool = {
	definition: {
		name: 'process_start',
		description: 'Start an allow-listed process asynchronously, returning a session ID.',
		parameters: {
			type: 'object',
			properties: {
				command: { type: 'string', description: 'The command binary name.' },
				args: { type: 'array', items: { type: 'string' } }
			},
			required: ['command']
		}
	},
	execute: catchErrors(async ({ command, args = [] }) => {
		checkCommandAllowed(command);
		logger.info(`Starting process async: ${command} ${args.join(' ')}`);

		const child = spawn(command, args, { env: { ...process.env, PAGER: 'cat' } });
		const sessionId = `proc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

		const session = {
			child,
			stdout: '',
			stderr: '',
			exitCode: null,
			closed: false
		};

		child.stdout.on('data', d => session.stdout += d);
		child.stderr.on('data', d => session.stderr += d);
		child.on('close', code => {
			session.exitCode = code;
			session.closed = true;
			logger.info(`Async process ${sessionId} exited with code ${code}`);
		});

		asyncSessions.set(sessionId, session);
		return JSON.stringify({ sessionId, pid: child.pid });
	}, 'Failed to start process')
};

export const processReadOutputTool = {
	definition: {
		name: 'process_read_output',
		description: 'Read available stdout and stderr from an async process session (non-blocking).',
		parameters: {
			type: 'object',
			properties: {
				sessionId: { type: 'string', description: 'The session ID returned by process_start.' }
			},
			required: ['sessionId']
		}
	},
	execute: catchErrors(async ({ sessionId }) => {
		const session = asyncSessions.get(sessionId);
		if (!session) throw new Error(`Process session "${sessionId}" not found.`);

		const output = {
			closed: session.closed,
			exitCode: session.exitCode,
			stdout: session.stdout,
			stderr: session.stderr
		};

		// Clear read buffers so we only read new output next time
		session.stdout = '';
		session.stderr = '';

		return JSON.stringify(output, null, 2);
	}, 'Failed to read process output')
};

export const processWriteInputTool = {
	definition: {
		name: 'process_write_input',
		description: 'Write string to an active process session\'s standard input.',
		parameters: {
			type: 'object',
			properties: {
				sessionId: { type: 'string' },
				input: { type: 'string' },
				closeAfter: { type: 'boolean', default: false }
			},
			required: ['sessionId', 'input']
		}
	},
	execute: catchErrors(async ({ sessionId, input, closeAfter = false }) => {
		const session = asyncSessions.get(sessionId);
		if (!session) throw new Error(`Process session "${sessionId}" not found.`);
		if (session.closed) throw new Error('Process session is already closed.');

		session.child.stdin.write(input);
		if (closeAfter) {
			session.child.stdin.end();
		}

		return `Input written successfully to process stdin.`;
	}, 'Failed to write input to process')
};

export const processTerminateTool = {
	definition: {
		name: 'process_terminate',
		description: 'Terminate an async process session (sends SIGTERM, then SIGKILL after 1s if needed).',
		parameters: {
			type: 'object',
			properties: {
				sessionId: { type: 'string' }
			},
			required: ['sessionId']
		}
	},
	execute: catchErrors(async ({ sessionId }) => {
		const session = asyncSessions.get(sessionId);
		if (!session) throw new Error(`Process session "${sessionId}" not found.`);

		if (!session.closed) {
			session.child.kill('SIGTERM');
			setTimeout(() => {
				if (!session.closed) {
					session.child.kill('SIGKILL');
				}
			}, 1000);
		}

		asyncSessions.delete(sessionId);
		return `Process session ${sessionId} termination request sent.`;
	}, 'Failed to terminate process')
};

export const processListTool = {
	definition: {
		name: 'process_list',
		description: 'List running processes on the system (pid, ppid, uid, command). Read-only.',
		parameters: {
			type: 'object',
			properties: {}
		}
	},
	execute: catchErrors(async () => {
		logger.info('Listing active processes...');
		const { stdout } = await execAsync('ps -ax -o pid,ppid,uid,comm');
		const lines = stdout.trim().split('\n');
		const header = lines[0].trim().toLowerCase().split(/\s+/);
		
		const results = lines.slice(1).map(line => {
			const tokens = line.trim().split(/\s+/);
			const pid = tokens[0];
			const ppid = tokens[1];
			const uid = tokens[2];
			const command = tokens.slice(3).join(' ');
			return { pid: parseInt(pid, 10), ppid: parseInt(ppid, 10), uid: parseInt(uid, 10), command };
		});

		return JSON.stringify(results.slice(0, 1000), null, 2); // limit to 1000 processes
	}, 'Failed to list processes')
};

export const processKillTool = {
	definition: {
		name: 'process_kill',
		description: 'Send a signal to kill a process PID (refuses PID 1 or cross-user kills by default).',
		parameters: {
			type: 'object',
			properties: {
				pid: { type: 'integer', description: 'Process ID to kill.' },
				signal: { type: 'string', default: 'SIGTERM', description: 'The signal (e.g. "SIGTERM", "SIGKILL").' }
			},
			required: ['pid']
		}
	},
	execute: catchErrors(async ({ pid, signal = 'SIGTERM' }) => {
		if (pid === 1) throw new Error('Permission denied: cannot kill PID 1.');
		logger.info(`Sending ${signal} to PID ${pid}`);
		process.kill(pid, signal);
		return `Signal ${signal} sent to PID ${pid} successfully.`;
	}, 'Failed to kill process')
};
