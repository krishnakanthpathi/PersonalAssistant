import Database from 'better-sqlite3';
import { MongoClient } from 'mongodb';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

// Load .env configuration
dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017';
const MONGO_DB_NAME = process.env.MONGO_DB_NAME || 'assistant_platform';
const DB_FILE_PATH = path.resolve('data/assistant.db');

async function migrate() {
	console.log('--- Start SQLite to MongoDB Migration ---');

	// 1. Check if SQLite file exists
	if (!fs.existsSync(DB_FILE_PATH)) {
		console.log(`SQLite database not found at ${DB_FILE_PATH}. Nothing to migrate.`);
		return;
	}

	console.log(`Connecting to SQLite database: ${DB_FILE_PATH}`);
	const sqliteDb = new Database(DB_FILE_PATH);

	console.log(`Connecting to MongoDB at: ${MONGO_URI}`);
	const client = new MongoClient(MONGO_URI);
	await client.connect();
	const mongoDb = client.db(MONGO_DB_NAME);
	console.log(`Successfully connected to MongoDB: ${MONGO_DB_NAME}`);

	try {
		// --- 2. Migrate Telemetry Logs & Tool Calls ---
		console.log('Checking telemetry logs...');
		const telemetryCollection = mongoDb.collection('telemetry_logs');
		
		const tablesQuery = sqliteDb.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name IN ('telemetry_logs', 'tool_calls')").all();
		const tableNames = tablesQuery.map(t => t.name);

		if (tableNames.includes('telemetry_logs')) {
			const telemetryRows = sqliteDb.prepare('SELECT * FROM telemetry_logs').all();
			console.log(`Found ${telemetryRows.length} telemetry logs in SQLite.`);

			let migratedLogsCount = 0;
			for (const row of telemetryRows) {
				let toolCalls = [];
				if (tableNames.includes('tool_calls')) {
					const toolRows = sqliteDb.prepare('SELECT * FROM tool_calls WHERE request_id = ?').all(row.id);
					toolCalls = toolRows.map(tool => ({
						name: tool.name,
						args: JSON.parse(tool.args || '{}'),
						latency: tool.latency,
						latencyFromRequestStart: tool.latency_from_request_start || 0,
						success: tool.success === 1,
						error: tool.error || null,
						resultSummary: tool.result_summary || ''
					}));
				}

				const doc = {
					_id: row.id,
					timestamp: row.timestamp ? new Date(row.timestamp) : new Date(),
					prompt: row.prompt,
					success: row.success === 1,
					totalDuration: row.total_duration,
					retrievalTime: row.retrieval_time,
					generationTime: row.generation_time,
					contextProcessingTime: row.context_processing_time,
					givenContext: row.given_context,
					generatedContext: row.generated_context,
					screenshotCount: row.screenshot_count,
					appleScriptCount: row.apple_script_count,
					fetchUiCount: row.fetch_ui_count,
					annotateCount: row.annotate_count,
					toolCalls
				};

				await telemetryCollection.replaceOne({ _id: doc._id }, doc, { upsert: true });
				migratedLogsCount++;
			}
			console.log(`Successfully migrated ${migratedLogsCount} telemetry logs into MongoDB.`);
		} else {
			console.log('No telemetry_logs table in SQLite to migrate.');
		}

		// --- 3. Migrate Chat Sessions & Message History ---
		console.log('Checking chat sessions...');
		const chatsCollection = mongoDb.collection('chat_sessions');

		const chatTablesQuery = sqliteDb.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name IN ('chat_sessions', 'chat_messages')").all();
		const chatTableNames = chatTablesQuery.map(t => t.name);

		if (chatTableNames.includes('chat_sessions')) {
			const sessionRows = sqliteDb.prepare('SELECT * FROM chat_sessions').all();
			console.log(`Found ${sessionRows.length} chat sessions in SQLite.`);

			let migratedSessionsCount = 0;
			for (const row of sessionRows) {
				let messages = [];
				if (chatTableNames.includes('chat_messages')) {
					const messageRows = sqliteDb.prepare('SELECT * FROM chat_messages WHERE session_id = ? ORDER BY id ASC').all(row.id);
					messages = messageRows.map(m => ({
						role: m.role,
						content: m.content,
						speech: m.speech || null,
						logs: m.logs ? JSON.parse(m.logs) : [],
						isError: m.is_error === 1,
						createdAt: m.created_at ? new Date(m.created_at) : new Date()
					}));
				}

				const doc = {
					_id: row.id,
					title: row.title,
					createdAt: row.created_at ? new Date(row.created_at) : new Date(),
					updatedAt: row.updated_at ? new Date(row.updated_at) : new Date(),
					messages
				};

				await chatsCollection.replaceOne({ _id: doc._id }, doc, { upsert: true });
				migratedSessionsCount++;
			}
			console.log(`Successfully migrated ${migratedSessionsCount} chat sessions into MongoDB.`);
		} else {
			console.log('No chat_sessions table in SQLite to migrate.');
		}

		console.log('--- Migration Completed Successfully ---');
	} catch (error) {
		console.error('Migration failed with error:', error);
	} finally {
		sqliteDb.close();
		await client.close();
	}
}

migrate();
