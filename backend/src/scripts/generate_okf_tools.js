import { connectToMongoDB } from '../config/mongodb.js';
import { mcpManager } from '../mcp/mcpManager.js';
import { registry } from '../orchestrator/registry.js';
import { callLLM } from '../orchestrator/commonFunctions.js';
import { logger } from '../utils/logger.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CATALOG_DIR = path.join(__dirname, '../../data/knowledge_catalog/tools');

// Hardcoded categorizer for clustering the tools
function categorizeTool(toolName, description = '') {
	const name = toolName.toLowerCase();
	const desc = description.toLowerCase();

	if (name.startsWith('api-') || name.includes('notion')) {
		return 'notion';
	}
	if (name.startsWith('fs_') || name.includes('read_file') || name.includes('write_file') || name.includes('directory') || name.includes('folder') || name.includes('file_info') || name.includes('allowed_directories')) {
		return 'filesystem';
	}
	if (name.startsWith('process_') || name.includes('process')) {
		return 'process_management';
	}
	if (name.includes('calendar') || name.includes('event')) {
		return 'google_calendar';
	}
	if (name.includes('gmail') || name.includes('mail') || name.includes('inbox') || name.includes('message')) {
		return 'gmail';
	}
	if (name.includes('youtube') || name.includes('video_converter') || name.includes('videoconverter')) {
		return 'media';
	}
	if (name.includes('window') || name.includes('space') || name.includes('list_apps') || name.includes('focus_app')) {
		return 'window_management';
	}
	if (name.includes('finder') || name.includes('quick_look') || name.includes('trash') || name.includes('spotlight') || name.includes('shortcut')) {
		return 'finder';
	}
	if (name.includes('mouse') || name.includes('key_') || name.includes('keystroke') || name.includes('type_text') || name.includes('applescript')) {
		return 'input_simulation';
	}
	if (name.includes('firecrawl') || name.includes('web_scrape') || name.includes('web_search')) {
		return 'web_browsing';
	}
	if (name.includes('github') || name.includes('git')) {
		return 'github';
	}
	if (name.includes('rds') || name.includes('database') || name.includes('sql') || name.includes('query')) {
		return 'network_utilities';
	}

	// Default/Fallback
	return 'system_automation';
}

async function run() {
	logger.info('Connecting to Database...');
	await connectToMongoDB();

	logger.info('Initializing MCP Manager...');
	await mcpManager.initialize();

	logger.info('Fetching registered tools...');
	const rawTools = await registry.getOllamaTools();
	logger.info(`Found ${rawTools.length} total tools registered.`);

	// Group the tools
	const groups = {};
	for (const tool of rawTools) {
		const name = tool.function?.name || tool.name;
		const desc = tool.function?.description || tool.description || '';
		const category = categorizeTool(name, desc);

		if (!groups[category]) {
			groups[category] = [];
		}
		groups[category].push({
			name,
			description: desc,
			parameters: tool.function?.parameters || tool.parameters || {}
		});
	}

	logger.info(`Grouped tools into ${Object.keys(groups).length} categories.`);

	// Create directories if not exist
	if (!fs.existsSync(CATALOG_DIR)) {
		fs.mkdirSync(CATALOG_DIR, { recursive: true });
	}

	for (const [category, toolsList] of Object.entries(groups)) {
		const filename = `${category}.md`;
		const filePath = path.join(CATALOG_DIR, filename);

		logger.info(`Processing category: ${category} with ${toolsList.length} tools...`);

		// Prepare LLM request to generate the OKF content for this category
		const toolsSummary = toolsList.map(t => `- **\`${t.name}\`**: ${t.description}`).join('\n');
		const prompt = `You are an expert OKF (Open Knowledge Format) categorizer.
Generate a structured Markdown documentation file for the tool category: "${category}".
Here are the active registered tools under this category:
${toolsSummary}

Your response must be a JSON object (no markdown wrappers like \`\`\`json, just the raw JSON string) containing exactly these keys:
{
  "title": "A high-quality, professional title for this tool group (e.g. 'macOS System Input & Keyboard Simulation')",
  "description": "A concise single-sentence summary of what this tool group accomplishes",
  "tags": ["tag1", "tag2", "tag3", "tag4"],
  "explanation": "A short markdown description introducing these tools and listing them with descriptions"
}

Make sure tags cover all related keywords and names of tools so that keyword matching finds them easily.
Provide only valid JSON.`;

		let meta = {
			title: `${category.toUpperCase().replace(/_/g, ' ')} Tools`,
			description: `Tools for ${category.replace(/_/g, ' ')}.`,
			tags: [category.replace(/_/g, ' ')],
			explanation: toolsSummary
		};

		try {
			logger.info(`Calling LLM to generate metadata for ${category}...`);
			const response = await callLLM([
				{ role: 'system', content: 'You are a JSON helper.' },
				{ role: 'user', content: prompt }
			]);
			const rawContent = (response.message?.content || response.content || (typeof response === 'string' ? response : '')).trim();
			// Strip markdown code block ticks if any
			const cleaned = rawContent.replace(/^```json/i, '').replace(/```$/, '').trim();
			meta = JSON.parse(cleaned);
		} catch (error) {
			logger.warn(`Failed to parse LLM response for category ${category}: ${error.message}. Using default metadata.`);
		}

		// Ensure tools array in frontmatter includes all listed tool names
		const toolsNames = toolsList.map(t => t.name);

		// Format OKF frontmatter and content
		const fileContent = `---
type: tool_group
title: ${meta.title}
description: ${meta.description}
tags: [${meta.tags.join(', ')}]
tools: [${toolsNames.join(', ')}]
timestamp: ${new Date().toISOString()}
---

# ${meta.title}

${meta.explanation}
`;

		fs.writeFileSync(filePath, fileContent, 'utf-8');
		logger.info(`Successfully wrote OKF file: ${filePath}`);
	}

	logger.info('Tool catalog generation completed successfully!');
	process.exit(0);
}

run().catch(err => {
	logger.error(`Generation failed: ${err.message}`);
	process.exit(1);
});
