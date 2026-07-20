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

	async initialize() {
		try {
			if (!fs.existsSync(CATALOG_DIR)) {
				logger.info(`Creating OKF catalog directory at: ${CATALOG_DIR}`);
				fs.mkdirSync(CATALOG_DIR, { recursive: true });
			}

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

		// Sort descending
		scoredDocs.sort((a, b) => b.score - a.score);

		const maxScore = scoredDocs[0]?.score || 0;
		if (maxScore === 0) {
			return this.documents;
		}

		// Only return docs that have a score close to the maximum matched score
		const threshold = Math.max(1, maxScore - 2);
		const matches = scoredDocs
			.filter(item => item.score >= threshold)
			.map(item => item.doc);

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
