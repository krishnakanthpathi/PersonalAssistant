import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../utils/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CATALOG_DIR = path.resolve(__dirname, '../../data/knowledge_catalog');

export function parseMarkdownOKF(fileContent) {
	const match = fileContent.match(/^---\r?\n([\s\S]+?)\r?\n---\r?\n([\s\S]*)$/);
	if (!match) {
		return { frontmatter: {}, content: fileContent };
	}
	const yamlStr = match[1];
	const content = match[2];
	const frontmatter = {};

	yamlStr.split('\n').forEach(line => {
		const colonIdx = line.indexOf(':');
		if (colonIdx > -1) {
			const key = line.slice(0, colonIdx).trim();
			let val = line.slice(colonIdx + 1).trim();

			// Strip single/double quotes
			if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
				val = val.slice(1, -1);
			}
			// Parse simple array: [a, b, c]
			if (val.startsWith('[') && val.endsWith(']')) {
				val = val.slice(1, -1).split(',').map(s => s.trim().replace(/^['"]|['"]$/g, ''));
			}
			frontmatter[key] = val;
		}
	});
	return { frontmatter, content };
}

async function getMarkdownFilesRecursively(dir) {
	let results = [];
	const list = await fs.promises.readdir(dir, { withFileTypes: true });
	for (const entry of list) {
		const resPath = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			const nested = await getMarkdownFilesRecursively(resPath);
			results = results.concat(nested);
		} else if (entry.isFile() && entry.name.endsWith('.md')) {
			results.push(resPath);
		}
	}
	return results;
}

class OKFEngineClass {
	constructor() {
		this.documents = [];
		this.initialized = false;
	}

	async ensureDefaultCatalogs() {
		const toolsDir = path.join(CATALOG_DIR, 'tools');
		if (!fs.existsSync(toolsDir)) {
			fs.mkdirSync(toolsDir, { recursive: true });
		}

		const mcpMgmtPath = path.join(toolsDir, 'mcp_management.md');
		if (!fs.existsSync(mcpMgmtPath)) {
			const content = `---
type: tool_group
title: MCP Server Management & Dynamic Tool Integration
description: Utilities to connect, configure, manage, and execute dynamic Model Context Protocol (MCP) servers.
tags: [mcp, server, integration, tools, dynamic, connect]
tools: [integrate_mcp_server, get_knowledge_document, update_knowledge_document, create_prebuilt_form, rds_query]
timestamp: ${new Date().toISOString()}
---

# MCP Server Management & Dynamic Tool Integration

Provides system capabilities to register, connect, manage, and query dynamic MCP servers and system tools.

### Available Tools
- **\`integrate_mcp_server\`**: Add, edit, test, enable, disable, or delete MCP servers dynamically.
- **\`get_knowledge_document\`**: Fetch knowledge documents from the OKF catalog.
- **\`update_knowledge_document\`**: Update or append content to an OKF catalog document.
- **\`create_prebuilt_form\`**: Create structured UI form inputs for users.
- **\`rds_query\`**: Query relational database systems.
`;
			fs.writeFileSync(mcpMgmtPath, content, 'utf8');
		}

		const mcpIntegPath = path.join(CATALOG_DIR, 'mcp_integrations.md');
		if (!fs.existsSync(mcpIntegPath)) {
			const content = `---
type: integration
title: MCP & Workspace Integrations
description: Active Model Context Protocol integrations, Notion configs, YouTube requirements, and Gmail details.
tags: [integration, configs, mcp]
timestamp: ${new Date().toISOString()}
---

# MCP & Workspace Integrations

Default integration configs for MCP servers and workspace integrations.
`;
			fs.writeFileSync(mcpIntegPath, content, 'utf8');
		}

		const sysEnvPath = path.join(CATALOG_DIR, 'system_environment.md');
		if (!fs.existsSync(sysEnvPath)) {
			const content = `---
type: system_environment
title: System Environment
description: Home lab setup, devices, network configuration, and local server setups.
tags: [systems, hardware, network]
timestamp: ${new Date().toISOString()}
---

# System Environment

System environment configuration and host details.
`;
			fs.writeFileSync(sysEnvPath, content, 'utf8');
		}
	}

	async initialize() {
		try {
			if (!fs.existsSync(CATALOG_DIR)) {
				logger.info(`Creating OKF catalog directory at: ${CATALOG_DIR}`);
				fs.mkdirSync(CATALOG_DIR, { recursive: true });
			}

			await this.ensureDefaultCatalogs();

			logger.info(`Initializing OKF Knowledge Engine from ${CATALOG_DIR}...`);
			const mdFilepaths = await getMarkdownFilesRecursively(CATALOG_DIR);

			this.documents = [];
			for (const filepath of mdFilepaths) {
				const file = path.relative(CATALOG_DIR, filepath);
				const contentStr = await fs.promises.readFile(filepath, 'utf8');
				const parsed = parseMarkdownOKF(contentStr);

				this.documents.push({
					filename: file,
					filepath,
					type: parsed.frontmatter.type || 'unknown',
					title: parsed.frontmatter.title || file,
					tags: Array.isArray(parsed.frontmatter.tags) ? parsed.frontmatter.tags : [],
					timestamp: parsed.frontmatter.timestamp || '',
					frontmatter: parsed.frontmatter,
					content: parsed.content.trim()
				});
			}
			this.initialized = true;
			logger.info(`OKF Engine loaded ${this.documents.length} knowledge documents successfully.`);
		} catch (error) {
			logger.error(`Failed to initialize OKF engine: ${error.message}`);
			this.initialized = false;
		}
	}

	loadAll() {
		return this.documents;
	}

	match(query) {
		if (!this.initialized || this.documents.length === 0) {
			return [];
		}

		if (!query) {
			return this.documents;
		}

		const terms = query.toLowerCase().split(/\W+/).filter(t => t.length > 2);
		if (terms.length === 0) {
			// Return all documents if the query lacks specific keywords
			return this.documents;
		}

		const searchTerms = [...terms];
		terms.forEach(term => {
			if (term.endsWith('s') && term.length > 3) {
				searchTerms.push(term.slice(0, -1));
			}
		});

		const scoredDocs = this.documents.map(doc => {
			let score = 0;
			const searchArea = `${doc.title} ${doc.type} ${doc.tags.join(' ')} ${doc.content}`.toLowerCase();

			searchTerms.forEach(term => {
				if (searchArea.includes(term)) {
					score += 1;
					// Extra weight for metadata hits
					if (doc.title.toLowerCase().includes(term)) score += 3;
					if (doc.type.toLowerCase().includes(term)) score += 3;
					if (doc.tags.some(t => t.toLowerCase().includes(term))) score += 2;
				}
			});
			return { doc, score };
		});

		// Group scored documents by parent folder to avoid search shadowing.
		// A high matching score in user profile docs should not filter out matched tool documentation docs.
		const groups = {
			user: scoredDocs.filter(item => item.doc.filename.startsWith('user/')),
			tools: scoredDocs.filter(item => item.doc.filename.startsWith('tools/')),
			others: scoredDocs.filter(item => !item.doc.filename.startsWith('user/') && !item.doc.filename.startsWith('tools/'))
		};

		const matches = [];
		let totalMaxScore = 0;

		Object.entries(groups).forEach(([groupName, groupDocs]) => {
			if (groupDocs.length === 0) return;
			const maxScore = Math.max(...groupDocs.map(item => item.score));
			if (maxScore > 0) {
				totalMaxScore = Math.max(totalMaxScore, maxScore);
				const threshold = Math.max(1, maxScore - 2);
				groupDocs.forEach(item => {
					if (item.score >= threshold) {
						matches.push(item.doc);
					}
				});
			}
		});

		if (totalMaxScore === 0) {
			// If absolutely nothing matched, return everything as fallback
			return this.documents;
		}

		return matches;
	}

	async updateDocument(filename, contentBody, newFrontmatter = {}) {
		// Find if the document already exists in the catalog (matching path or basename)
		const existingDoc = this.documents.find(d =>
			d.filename.toLowerCase() === filename.toLowerCase() ||
			path.basename(d.filename).toLowerCase() === filename.toLowerCase()
		);
		const relativePath = existingDoc ? existingDoc.filename : filename;
		const filepath = path.join(CATALOG_DIR, relativePath);
		const parentDir = path.dirname(filepath);
		if (!fs.existsSync(parentDir)) {
			fs.mkdirSync(parentDir, { recursive: true });
		}

		// Load existing to preserve frontmatter or check existence
		let existingFrontmatter = {};
		if (fs.existsSync(filepath)) {
			const existingText = await fs.promises.readFile(filepath, 'utf8');
			const parsed = parseMarkdownOKF(existingText);
			existingFrontmatter = parsed.frontmatter;
		}

		const mergedFrontmatter = {
			...existingFrontmatter,
			...newFrontmatter,
			timestamp: new Date().toISOString()
		};

		// Format frontmatter back to YAML string
		let yamlStr = '---\n';
		Object.entries(mergedFrontmatter).forEach(([k, v]) => {
			if (Array.isArray(v)) {
				yamlStr += `${k}: [${v.join(', ')}]\n`;
			} else {
				yamlStr += `${k}: ${v}\n`;
			}
		});
		yamlStr += '---\n';

		const fullContent = yamlStr + contentBody.trim() + '\n';
		await fs.promises.writeFile(filepath, fullContent, 'utf8');

		// Reload catalog to refresh engine cache
		await this.initialize();
		logger.info(`OKF Engine document updated and reloaded: ${relativePath}`);
	}
}

export const OKFEngine = new OKFEngineClass();
