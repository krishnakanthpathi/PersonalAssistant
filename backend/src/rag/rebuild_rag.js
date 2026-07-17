import { VectorDB } from './vectorDb.js';
import { PersonalInfoVectorDB } from './personalDb.js';
import { mcpManager } from '../mcp/mcpManager.js';
import { registry } from '../orchestrator/registry.js';
import { logger } from '../utils/logger.js';

async function rebuild() {
	logger.info('==================================================');
	logger.info('REBUILDING RAG DATABASES FROM SCRATCH');
	logger.info('==================================================');

	// 1. Rebuild Personal Info RAG
	logger.info('Connecting to personal_db...');
	const personalDb = new PersonalInfoVectorDB();
	personalDb.connect = personalDb.connect.bind(personalDb);
	personalDb.syncFromMemoryJson = personalDb.syncFromMemoryJson.bind(personalDb);
	personalDb.clear = personalDb.clear.bind(personalDb);
	await personalDb.connect();
	
	logger.info('Wiping personal_info collection...');
	await personalDb.clear();
	
	logger.info('Seeding personal_info from memory.json using cloud embeddings...');
	await personalDb.syncFromMemoryJson();

	// 2. Rebuild Tools RAG
	logger.info('Connecting to tools_db...');
	const toolsDb = new VectorDB();
	toolsDb.connect = toolsDb.connect.bind(toolsDb);
	toolsDb.clear = toolsDb.clear.bind(toolsDb);
	await toolsDb.connect();
	
	logger.info('Wiping tools collection...');
	await toolsDb.clear();

	logger.info('Initializing MCP and registry...');
	await mcpManager.initialize();
	registry.initialize();

	logger.info('Seeding tools embeddings using cloud embeddings...');
	// This will fetch all active tools, see that they are not cached, and generate embeddings for them
	await registry.getRelevantTools('test query to trigger initial tools embedding');

	logger.info('==================================================');
	logger.info('REBUILD COMPLETE!');
	logger.info('==================================================');
	process.exit(0);
}

rebuild().catch(err => {
	logger.error(`Rebuild failed: ${err.message}`);
	process.exit(1);
});
