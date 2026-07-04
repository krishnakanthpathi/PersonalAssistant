/**
 * Coordinates: Ingest -> Vectorize -> Store -> Query
 */
import { logger } from '../utils/logger.js';

export class RAGPipeline {
	async processDocument(filePath) {
		logger.info(`Ingesting document: ${filePath}`);
	}

	async query(queryString) {
		logger.info(`Querying vector database for: ${queryString}`);
	}
}
