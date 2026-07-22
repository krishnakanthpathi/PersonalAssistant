import { registry } from '../orchestrator/registry.js';
import { mcpManager } from '../mcp/mcpManager.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const configPath = path.join(__dirname, '../../mcp-config.json');

async function testIntegrationTool() {
	console.log('--- Step 1: Initializing Tool Registry and MCP Manager ---');
	registry.initialize();
	await mcpManager.initialize();

	const tool = registry.tools.get('integrate_mcp_server');
	if (!tool) {
		console.error('FAIL: integrate_mcp_server tool is NOT registered in registry!');
		process.exit(1);
	}
	console.log('SUCCESS: integrate_mcp_server tool found in registry.');

	console.log('\n--- Step 2: Testing integrate_mcp_server tool execution ---');
	const testServerName = 'test-demo-mcp';
	
	// Create a minimal sample local Node MCP server script
	const localCode = {
		filename: 'index.js',
		content: `
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ListToolsRequestSchema, CallToolRequestSchema } from "@modelcontextprotocol/sdk/types.js";

const server = new Server({ name: "test-demo-mcp", version: "1.0.0" }, { capabilities: { tools: {} } });

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [{ name: "demo_echo", description: "Echoes input back", inputSchema: { type: "object", properties: { text: { type: "string" } } } }]
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === "demo_echo") {
    return { content: [{ type: "text", text: "Echo: " + (request.params.arguments?.text || "") }] };
  }
  throw new Error("Tool not found");
});

const transport = new StdioServerTransport();
await server.connect(transport);
`
	};

	try {
		const resultString = await tool.execute({
			name: testServerName,
			type: 'stdio',
			command: 'node',
			args: [path.resolve(__dirname, `../../../mcps/${testServerName}/index.js`)],
			localCode
		});

		console.log('Tool Execution Output:\n', resultString);
		const resultObj = JSON.parse(resultString);

		if (resultObj.success && resultObj.serverName === testServerName) {
			console.log(`\nSUCCESS: Server "${testServerName}" registered and connected!`);
		} else {
			console.error('\nFAIL: Response indicated failure:', resultObj);
			process.exit(1);
		}

		// Verify mcp-config.json file
		const configData = JSON.parse(fs.readFileSync(configPath, 'utf8'));
		if (configData.mcpServers && configData.mcpServers[testServerName]) {
			console.log(`\nSUCCESS: Found "${testServerName}" in mcp-config.json`);
		} else {
			console.error(`\nFAIL: Server "${testServerName}" not found in mcp-config.json`);
			process.exit(1);
		}

		// Verify OKF catalog file generation
		const okfFile = path.resolve(__dirname, `../../data/knowledge_catalog/tools/mcp_${testServerName}.md`);
		if (fs.existsSync(okfFile)) {
			console.log(`\nSUCCESS: Auto-generated OKF RAG catalog file at ${okfFile}`);
		} else {
			console.error(`\nFAIL: OKF catalog file not found at ${okfFile}`);
			process.exit(1);
		}

		// Cleanup test entry from config, OKF catalog & disconnect
		console.log('\n--- Step 3: Cleaning up test server ---');
		delete configData.mcpServers[testServerName];
		fs.writeFileSync(configPath, JSON.stringify(configData, null, 2), 'utf8');
		await mcpManager.disconnectServer(testServerName);
		
		if (fs.existsSync(okfFile)) {
			fs.unlinkSync(okfFile);
		}

		// Remove test directory if created
		const testDir = path.resolve(__dirname, `../../../mcps/${testServerName}`);
		if (fs.existsSync(testDir)) {
			fs.rmSync(testDir, { recursive: true, force: true });
		}
		console.log('Cleanup completed successfully.');

	} catch (err) {
		console.error('ERROR running integrate_mcp_server tool test:', err);
		process.exit(1);
	}

	console.log('\nAll tests passed successfully!');
	process.exit(0);
}

testIntegrationTool();
