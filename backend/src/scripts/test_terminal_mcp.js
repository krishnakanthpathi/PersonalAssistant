import { connectToMongoDB } from '../config/mongodb.js';
import { mcpManager } from '../mcp/mcpManager.js';
import { registry } from '../orchestrator/registry.js';
import { logger } from '../utils/logger.js';

async function runTests() {
	console.log('--- STARTING TERMINAL MCP INTEGRATION TESTS ---');

	// 1. Initialize MongoDB because mcpManager relies on MongoDB for some client syncs
	console.log('Connecting to MongoDB...');
	await connectToMongoDB();
	console.log('Connected to MongoDB successfully.');

	// 2. Initialize the MCP Manager
	console.log('Initializing MCP Manager...');
	await mcpManager.initialize();
	console.log('MCP Manager initialized.');

	// 3. Retrieve the terminal client
	const terminalClient = mcpManager.servers.get('terminal');
	if (!terminalClient) {
		console.error('FAIL: Terminal MCP Client is not registered or connected in mcpManager!');
		process.exit(1);
	}
	console.log('SUCCESS: Terminal MCP Client successfully registered.');

	// 4. Test listTools()
	console.log('\nTesting listTools()...');
	const tools = await terminalClient.listTools();
	console.log(`Retrieved ${tools.length} tools:`);
	tools.forEach(t => console.log(` - ${t.name}: ${t.description}`));

	const toolNames = tools.map(t => t.name);
	const requiredTools = ['execute_command', 'change_directory', 'get_current_directory', 'get_allowed_commands'];
	for (const reqTool of requiredTools) {
		if (!toolNames.includes(reqTool)) {
			console.error(`FAIL: Missing required tool "${reqTool}"`);
			process.exit(1);
		}
	}
	console.log('SUCCESS: All required terminal tools are exposed.');

	// 5. Test get_allowed_commands
	console.log('\nTesting get_allowed_commands...');
	const allowedRes = await mcpManager.callTool('terminal', 'get_allowed_commands', {});
	const allowedText = allowedRes.content?.[0]?.text;
	console.log(`Allowed commands reported: ${allowedText}`);
	if (!allowedText || !allowedText.includes('echo')) {
		console.error('FAIL: get_allowed_commands did not return correct list.');
		process.exit(1);
	}
	console.log('SUCCESS: get_allowed_commands executed correctly.');

	// 6. Test execute_command with an ALLOWED command (echo)
	console.log('\nTesting execute_command with ALLOWED command (echo)...');
	const echoRes = await mcpManager.callTool('terminal', 'execute_command', {
		command: 'echo',
		args: ['Hello', 'Antigravity', 'MCP']
	});
	const echoText = echoRes.content?.[0]?.text;
	console.log('Echo Result Output:');
	console.log(echoText);
	if (echoRes.isError || !echoText || !echoText.includes('Hello Antigravity MCP')) {
		console.error('FAIL: execute_command (echo) failed or returned incorrect result.');
		process.exit(1);
	}
	console.log('SUCCESS: execute_command (echo) completed successfully.');

	// 7. Test execute_command with an UNALLOWED command (rm)
	console.log('\nTesting execute_command with BLOCKED command (rm)...');
	const blockedRes = await mcpManager.callTool('terminal', 'execute_command', {
		command: 'rm',
		args: ['-rf', '/tmp/somefile']
	});
	const blockedText = blockedRes.content?.[0]?.text;
	console.log('Blocked Command Output (Should report error):');
	console.log(blockedText);
	if (!blockedRes.isError && !blockedText.includes('not allowed')) {
		console.error('FAIL: Blocked command "rm" did not return security rejection error.');
		process.exit(1);
	}
	console.log('SUCCESS: Security check blocked unauthorized command "rm" correctly.');

	// 8. Test change_directory and get_current_directory
	console.log('\nTesting directory navigation...');
	const startCwdRes = await mcpManager.callTool('terminal', 'get_current_directory', {});
	const startCwd = startCwdRes.content?.[0]?.text;
	console.log(`Start CWD: ${startCwd}`);

	console.log('Changing directory to parent ".."');
	await mcpManager.callTool('terminal', 'change_directory', { path: '..' });

	const newCwdRes = await mcpManager.callTool('terminal', 'get_current_directory', {});
	const newCwd = newCwdRes.content?.[0]?.text;
	console.log(`New CWD: ${newCwd}`);

	if (startCwd === newCwd) {
		console.error('FAIL: change_directory did not change the working directory.');
		process.exit(1);
	}
	console.log('SUCCESS: Directory navigation functions correctly.');

	// 9. Test RAG Tool Retrieval for terminal tools
	console.log('\nTesting RAG tool retrieval for terminal tools...');
	const relevantTools = await registry.getRelevantTools('Run a terminal command to compile code');
	const relevantNames = relevantTools.map(t => t.function?.name || t.name);
	console.log('Retrieved relevant tools:', relevantNames.join(', '));
	
	if (!relevantNames.includes('execute_command')) {
		console.error('FAIL: RAG retrieval did not find execute_command for query "Run a terminal command to compile code"');
		process.exit(1);
	}
	console.log('SUCCESS: RAG retrieval successfully matched and retrieved terminal tools.');

	console.log('\n--- ALL TERMINAL MCP TESTS PASSED SUCCESSFULLY! ---');
	process.exit(0);
}

runTests().catch(err => {
	console.error('FAIL: Unexpected error during tests:', err);
	process.exit(1);
});
