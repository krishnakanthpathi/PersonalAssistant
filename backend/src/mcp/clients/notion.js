import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';

export class NotionClient {
    constructor(config) {
        this.config = config;
        this.client = null;
    }

    async connect() {
        logger.info('Initializing Notion MCP transport...');

        const transport = new StdioClientTransport({
            command: this.config.command,
            args: this.config.args,
            env: {
                ...process.env,
                NOTION_TOKEN: env.NOTION_TOKEN,
                NOTION_API_KEY: env.NOTION_TOKEN
            }
        });

        this.client = new Client({
            name: 'notion-client',
            version: '1.0.0'
        }, {
            capabilities: {}
        });

        await this.client.connect(transport);
        logger.info('Successfully connected to Notion MCP server.');
    }

    async listTools() {
        const response = await this.client.listTools();
        return response.tools || [];
    }

    async callTool(name, args) {
        let normalizedArgs = { ...args };

        // Helper to format 32-char ID into standard UUID format (8-4-4-4-12)
        const formatUUID = (rawId) => {
            if (!rawId || typeof rawId !== 'string') return rawId;
            const cleaned = rawId.trim();
            if (cleaned.includes('-')) return cleaned;
            if (cleaned.length !== 32) return cleaned;
            return `${cleaned.slice(0, 8)}-${cleaned.slice(8, 12)}-${cleaned.slice(12, 16)}-${cleaned.slice(16, 20)}-${cleaned.slice(20)}`;
        };

        if (name === 'API-post-page' || name === 'API-create-a-data-source' || name === 'API-move-page') {
            if (normalizedArgs.parent) {
                // If parent is a string, wrap it appropriately
                if (typeof normalizedArgs.parent === 'string') {
                    const formattedId = formatUUID(normalizedArgs.parent);
                    if (name === 'API-move-page') {
                        normalizedArgs.parent = {
                            type: 'page_id',
                            page_id: formattedId
                        };
                    } else {
                        // Default to page_id for API-post-page / API-create-a-data-source
                        normalizedArgs.parent = {
                            page_id: formattedId
                        };
                    }
                } else if (typeof normalizedArgs.parent === 'object') {
                    // Normalize nested ID format in objects
                    if (normalizedArgs.parent.page_id) {
                        normalizedArgs.parent.page_id = formatUUID(normalizedArgs.parent.page_id);
                    }
                    if (normalizedArgs.parent.database_id) {
                        normalizedArgs.parent.database_id = formatUUID(normalizedArgs.parent.database_id);
                    }
                }
            }

            if (name === 'API-post-page') {
                // Normalize properties: if it is a string, convert to standard Notion title property
                if (typeof normalizedArgs.properties === 'string') {
                    normalizedArgs.properties = {
                        title: [
                            {
                                type: 'text',
                                text: {
                                    content: normalizedArgs.properties
                                }
                            }
                        ]
                    };
                }

                // Normalize children: if any child is a string, convert to standard paragraph block
                if (Array.isArray(normalizedArgs.children)) {
                    normalizedArgs.children = normalizedArgs.children.map(child => {
                        if (typeof child === 'string') {
                            return {
                                object: 'block',
                                type: 'paragraph',
                                paragraph: {
                                    rich_text: [
                                        {
                                            type: 'text',
                                            text: {
                                                content: child
                                            }
                                        }
                                    ]
                                }
                            };
                        }
                        return child;
                    });
                }
            }
        }

        return await this.client.callTool({
            name,
            arguments: normalizedArgs
        });
    }
}
