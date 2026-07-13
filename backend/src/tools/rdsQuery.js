import { catchErrors } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

export const rdsQueryTool = {
	definition: {
		name: 'query_rds_database',
		description: 'Connects to a PostgreSQL or MySQL database using a connection string URL and executes a database query (e.g. SELECT statements with filters/conditions).',
		parameters: {
			type: 'object',
			properties: {
				connectionString: {
					type: 'string',
					description: 'The full database connection string URI (e.g. "postgresql://user:password@host:port/database" or "mysql://user:password@host:port/database").'
				},
				query: {
					type: 'string',
					description: 'The SQL query to execute.'
				}
			},
			required: ['connectionString', 'query']
		}
	},

	execute: catchErrors(async ({ connectionString, query }) => {
		if (!connectionString) throw new Error('connectionString is required');
		if (!query) throw new Error('query is required');

		let url;
		try {
			url = new URL(connectionString);
		} catch (err) {
			throw new Error(`Invalid connection string URL: ${err.message}`);
		}

		const protocol = url.protocol.toLowerCase();
		logger.info(`Executing DB query via protocol: ${protocol}`);

		if (protocol === 'postgresql:' || protocol === 'postgres:') {
			const pgModule = await import('pg');
			const Client = pgModule.default?.Client || pgModule.Client;
			if (!Client) {
				throw new Error('Failed to load pg Client class');
			}
			const client = new Client({ connectionString });
			await client.connect();
			try {
				const res = await client.query(query);
				return JSON.stringify(res.rows, null, 2);
			} finally {
				await client.end();
			}
		} else if (protocol === 'mysql:') {
			const mysqlModule = await import('mysql2/promise');
			const createConnection = mysqlModule.default?.createConnection || mysqlModule.createConnection;
			if (!createConnection) {
				throw new Error('Failed to load mysql2/promise createConnection function');
			}
			const connection = await createConnection(connectionString);
			try {
				const [rows] = await connection.execute(query);
				return JSON.stringify(rows, null, 2);
			} finally {
				await connection.end();
			}
		} else {
			throw new Error(`Unsupported database protocol: "${protocol}". Supported protocols are postgresql/postgres and mysql.`);
		}
	}, 'Failed to execute database query')
};
