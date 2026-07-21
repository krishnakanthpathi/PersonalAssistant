import { OKFEngine } from '../rag/okfEngine.js';
import { catchErrors } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import fs from 'fs';
import path from 'path';

export const getKnowledgeDocumentTool = {
	definition: {
		name: 'get_knowledge_document',
		description: 'Retrieves the complete content and structured metadata of a specific OKF knowledge document (e.g. user_profile.md, developer_preferences.md, system_environment.md, routines_and_goals.md, mcp_integrations.md).',
		parameters: {
			type: 'object',
			properties: {
				filename: {
					type: 'string',
					description: 'The filename of the knowledge document (e.g., "user_profile.md", "developer_preferences.md").'
				}
			},
			required: ['filename']
		}
	},

	execute: catchErrors(async ({ filename }) => {
		if (!filename) throw new Error('filename is required');
		
		// Ensure engine is loaded/reloaded
		if (!OKFEngine.initialized) {
			await OKFEngine.initialize();
		}
		
		const docs = OKFEngine.loadAll();
		const doc = docs.find(d => 
			d.filename.toLowerCase() === filename.toLowerCase() ||
			path.basename(d.filename).toLowerCase() === filename.toLowerCase()
		);
		if (!doc) {
			throw new Error(`Knowledge document "${filename}" not found in OKF catalog.`);
		}
		
		// Return full document text
		const fullText = await fs.promises.readFile(doc.filepath, 'utf8');
		return {
			filename: doc.filename,
			filepath: doc.filepath,
			content: fullText
		};
	})
};

export const updateKnowledgeDocumentTool = {
	definition: {
		name: 'update_knowledge_document',
		description: 'Updates or creates a structured OKF knowledge document in the catalog. Modifies user profiles, developer configurations, systems info, or goals/routines dynamically.',
		parameters: {
			type: 'object',
			properties: {
				filename: {
					type: 'string',
					description: 'The target filename (e.g., "routines_and_goals.md").'
				},
				contentBody: {
					type: 'string',
					description: 'The body content of the document in markdown format (excluding the YAML frontmatter).'
				},
				type: {
					type: 'string',
					description: 'Optional. The document category type (e.g., "person", "preference", "routine", "system_environment", "integration").'
				},
				title: {
					type: 'string',
					description: 'Optional. The display title of the document.'
				},
				tags: {
					type: 'array',
					items: { type: 'string' },
					description: 'Optional. Relevant tags for the document.'
				}
			},
			required: ['filename', 'contentBody']
		}
	},

	execute: catchErrors(async ({ filename, contentBody, type, title, tags }) => {
		if (!filename) throw new Error('filename is required');
		if (contentBody === undefined || contentBody === null) throw new Error('contentBody is required');

		const frontmatterUpdate = {};
		if (type) frontmatterUpdate.type = type;
		if (title) frontmatterUpdate.title = title;
		if (tags) frontmatterUpdate.tags = tags;

		logger.info(`Updating OKF document: ${filename}`);
		await OKFEngine.updateDocument(filename, contentBody, frontmatterUpdate);
		
		return `Knowledge document "${filename}" updated successfully and reloaded into OKF Engine cache.`;
	})
};
