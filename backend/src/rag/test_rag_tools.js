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

	console.log('\nEnding RAG selection test.');
	process.exit(0);
}

testRAGSelection().catch(err => {
	console.error('Test run failed:', err);
	process.exit(1);
});
