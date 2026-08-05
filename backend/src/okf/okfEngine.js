import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../utils/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CATALOG_DIR = path.resolve(__dirname, '../../data/tools_catalog');

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
tools: [integrate_mcp_server, create_prebuilt_form, rds_query]
timestamp: ${new Date().toISOString()}
---

# MCP Server Management & Dynamic Tool Integration

Provides system capabilities to register, connect, manage, and query dynamic MCP servers and system tools.

### Available Tools
- **\`integrate_mcp_server\`**: Add, edit, test, enable, disable, or delete MCP servers dynamically.
- **\`create_prebuilt_form\`**: Create structured UI form inputs for users.
- **\`rds_query\`**: Query relational database systems.
`;
			fs.writeFileSync(mcpMgmtPath, content, 'utf8');
		}
	}

	async initialize() {
		try {
			const toolsDir = path.join(CATALOG_DIR, 'tools');
			if (!fs.existsSync(toolsDir)) {
				logger.info(`Creating OKF tools catalog directory at: ${toolsDir}`);
				fs.mkdirSync(toolsDir, { recursive: true });
			}

			await this.ensureDefaultCatalogs();

			logger.info(`Initializing OKF Tool Catalog Engine from ${toolsDir}...`);
			const mdFilepaths = await getMarkdownFilesRecursively(toolsDir);

			this.documents = [];
			for (const filepath of mdFilepaths) {
				const file = path.relative(CATALOG_DIR, filepath);
				const contentStr = await fs.promises.readFile(filepath, 'utf8');
				const parsed = parseMarkdownOKF(contentStr);

				// Only load tool_group documents
				if (parsed.frontmatter.type === 'tool_group') {
					this.documents.push({
						filename: file,
						filepath,
						type: parsed.frontmatter.type,
						title: parsed.frontmatter.title || file,
						tags: Array.isArray(parsed.frontmatter.tags) ? parsed.frontmatter.tags : [],
						timestamp: parsed.frontmatter.timestamp || '',
						frontmatter: parsed.frontmatter,
						content: parsed.content.trim()
					});
				}
			}
			this.initialized = true;
			logger.info(`OKF Engine loaded ${this.documents.length} tool group catalog documents successfully.`);
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

		const matches = [];
		const maxScore = Math.max(...scoredDocs.map(item => item.score), 0);
		if (maxScore > 0) {
			const threshold = Math.max(1, maxScore - 2);
			scoredDocs.forEach(item => {
				if (item.score >= threshold) {
					matches.push(item.doc);
				}
			});
			return matches;
		}

		return this.documents;
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
