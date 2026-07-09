import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { logger } from './logger.js';

const DB_FILE_PATH = path.resolve('data/assistant.db');

// Ensure data folder exists
const dir = path.dirname(DB_FILE_PATH);
if (!fs.existsSync(dir)) {
	fs.mkdirSync(dir, { recursive: true });
}

let db;
try {
	db = new Database(DB_FILE_PATH);
	// Optimize SQLite settings for development/local execution
	db.pragma('journal_mode = WAL');
	db.pragma('synchronous = NORMAL');
	logger.info(`SQLite database connected successfully at: ${DB_FILE_PATH}`);
} catch (error) {
	logger.error(`Failed to connect to SQLite database: ${error.message}`);
	throw error;
}

// Create tables
db.exec(`
	CREATE TABLE IF NOT EXISTS telemetry_logs (
		id TEXT PRIMARY KEY,
		timestamp TEXT,
		prompt TEXT,
		success INTEGER,
		total_duration REAL,
		retrieval_time REAL,
		generation_time REAL,
		context_processing_time REAL,
		given_context TEXT,
		generated_context TEXT,
		screenshot_count INTEGER,
		apple_script_count INTEGER,
		fetch_ui_count INTEGER,
		annotate_count INTEGER
	);

	CREATE TABLE IF NOT EXISTS tool_calls (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		request_id TEXT,
		name TEXT,
		args TEXT,
		latency REAL,
		success INTEGER,
		error TEXT,
		FOREIGN KEY(request_id) REFERENCES telemetry_logs(id) ON DELETE CASCADE
	);
`);

export { db };
export default db;
