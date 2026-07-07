import { mcpManager } from '../mcp/mcpManager.js';
import { registry } from '../orchestrator/registry.js';
import { logger } from '../utils/logger.js';

async function testRAGSelection() {
	logger.info('Starting RAG tool selection test...');

	// 1. Initialize MCP Manager to load all tools
	await mcpManager.initialize();

	const testCases = [
		{
			query: 'Set volume to 50%',
			expectedKeywords: ['volume']
		},
		{
			query: 'Create a Notion note with quick ideas',
			expectedKeywords: ['notion', 'page', 'create']
		},
		{
			query: 'List my calendar events',
			expectedKeywords: ['calendar', 'events']
		},
		{
			query: 'List the files in the directory',
			expectedKeywords: ['file', 'directory', 'list']
		},
		{
			query: 'Show me what applications are installed on this computer',
			expectedKeywords: ['application']
		},
		{
			query: 'Open Safari application',
			expectedKeywords: ['open_application']
		},
		{
			query: 'Take a screenshot of my screen',
			expectedKeywords: ['screenshot']
		},
		{
			query: 'Copy hello to my clipboard',
			expectedKeywords: ['clipboard']
		},
		{
			query: 'Pause the currently playing track in Spotify',
			expectedKeywords: ['media_control']
		},
		{
			query: 'Check my battery percentage and disk storage',
			expectedKeywords: ['system_stats']
		},
		{
			query: 'Switch system appearance to light mode',
			expectedKeywords: ['dark_mode']
		},
		{
			query: 'Speak hello world aloud',
			expectedKeywords: ['say_speech']
		},
		{
			query: 'Put the Mac computer to sleep',
			expectedKeywords: ['system_power']
		},
		{
			query: 'Check my wifi network status',
			expectedKeywords: ['wifi_control']
		},
		{
			query: 'Type my username krishnakanth on screen',
			expectedKeywords: ['keystroke']
		},
		{
			query: 'Press command option escape keys',
			expectedKeywords: ['keystroke']
		},
		{
			query: 'Open spotlight search by pressing command and space keys',
			expectedKeywords: ['keystroke']
		},
		{
			query: 'Get the current active application or window',
			expectedKeywords: ['active_window']
		},
		{
			query: 'Run a custom AppleScript script to check finder files',
			expectedKeywords: ['applescript']
		}
	];

	for (const tc of testCases) {
		console.log('\n==================================================');
		console.log(`QUERY: "${tc.query}"`);
		console.log('==================================================');

		const selectedTools = await registry.getRelevantTools(tc.query);
		
		console.log(`Selected ${selectedTools.length} tools:`);
		const selectedNames = selectedTools.map(t => t.function?.name || t.name);
		console.log(selectedNames);

		// Verify that at least one relevant tool is present
		const matchesKeyword = selectedNames.some(name => 
			tc.expectedKeywords.some(keyword => name.toLowerCase().includes(keyword))
		);

		if (matchesKeyword) {
			console.log('✅ TEST PASSED: Relevant tool selected.');
		} else {
			console.log('❌ TEST FAILED: No expected tool matches found.');
		}
	}

	// 2. Direct execution test of list_applications
	console.log('\n==================================================');
	console.log('EXECUTING: list_applications');
	console.log('==================================================');
	try {
		const result = await registry.callTool('list_applications', {});
		console.log('Result (first 500 chars):');
		console.log(result.substring(0, 500) + '...');
		console.log('✅ EXECUTION PASSED: Tool ran successfully.');
	} catch (error) {
		console.log('❌ EXECUTION FAILED:', error.message);
	}

	// 3. Direct execution test of open_application (Safari)
	console.log('\n==================================================');
	console.log('EXECUTING: open_application (Safari)');
	console.log('==================================================');
	try {
		const result = await registry.callTool('open_application', { app: 'Safari' });
		console.log('Result:', result);
		console.log('✅ EXECUTION PASSED: Tool ran successfully.');
	} catch (error) {
		console.log('❌ EXECUTION FAILED:', error.message);
	}

	// 4. Direct execution test of take_screenshot
	console.log('\n==================================================');
	console.log('EXECUTING: take_screenshot');
	console.log('==================================================');
	try {
		const result = await registry.callTool('take_screenshot', {});
		console.log('Result:', result);
		console.log('✅ EXECUTION PASSED: Tool ran successfully.');
	} catch (error) {
		console.log('❌ EXECUTION FAILED:', error.message);
	}

	// 5. Direct execution test of keystroke_action
	console.log('\n==================================================');
	console.log('EXECUTING: keystroke_action (type)');
	console.log('==================================================');
	try {
		const result = await registry.callTool('keystroke_action', { action: 'type', text: 'Hello!' });
		console.log('Result:', result);
		console.log('✅ EXECUTION PASSED: Tool ran successfully.');
	} catch (error) {
		console.log('❌ EXECUTION FAILED:', error.message);
	}

	// 6. Direct execution test of Spotlight Search via Keystroke automation
	console.log('\n==================================================');
	console.log('EXECUTING: Spotlight Search Simulation via Keystroke');
	console.log('==================================================');
	try {
		console.log('1. Pressing Cmd+Space to open Spotlight...');
		await registry.callTool('keystroke_action', { action: 'shortcut', key: 'space', modifiers: ['command'] });
		await new Promise(r => setTimeout(r, 1500)); // wait for overlay

		console.log('2. Typing query "Safari"...');
		await registry.callTool('keystroke_action', { action: 'type', text: 'Safari' });
		await new Promise(r => setTimeout(r, 1000)); // wait for results

		console.log('3. Pressing Enter to launch/search...');
		const result = await registry.callTool('keystroke_action', { action: 'shortcut', key: 'enter' });
		console.log('Result:', result);
		console.log('✅ EXECUTION PASSED: Spotlight search simulated successfully via keyboard shortcuts.');
	} catch (error) {
		console.log('❌ EXECUTION FAILED:', error.message);
	}

	// 7. Direct execution test of get_active_window
	console.log('\n==================================================');
	console.log('EXECUTING: get_active_window');
	console.log('==================================================');
	try {
		const result = await registry.callTool('get_active_window', {});
		console.log('Result:', result);
		console.log('✅ EXECUTION PASSED: Tool ran successfully.');
	} catch (error) {
		console.log('❌ EXECUTION FAILED:', error.message);
	}

	// 8. Direct execution test of run_applescript
	console.log('\n==================================================');
	console.log('EXECUTING: run_applescript');
	console.log('==================================================');
	try {
		const result = await registry.callTool('run_applescript', { script: 'get name of Application "Finder"' });
		console.log('Result:', result);
		console.log('✅ EXECUTION PASSED: Tool ran successfully.');
	} catch (error) {
		console.log('❌ EXECUTION FAILED:', error.message);
	}


	console.log('\nEnding RAG selection test.');
	process.exit(0);
}

testRAGSelection().catch(err => {
	console.error('Test run failed:', err);
	process.exit(1);
});
