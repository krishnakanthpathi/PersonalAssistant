import { getDB } from './mongodb.js';
import { logger } from './logger.js';

class MetricsService {
	constructor() {
		this.activeRequests = new Map();
	}

	startRequest(prompt) {
		const requestId = 'req_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
		const reqState = {
			id: requestId,
			timestamp: new Date().toISOString(),
			prompt,
			success: false,
			totalDuration: 0,
			retrievalTime: 0,
			generationTime: 0,
			contextProcessingTime: 0,
			givenContext: '',
			generatedContext: '',
			screenshotCount: 0,
			appleScriptCount: 0,
			fetchUiCount: 0,
			annotateCount: 0,
			toolCalls: [],
			startTime: Date.now()
		};
		this.activeRequests.set(requestId, reqState);
		return requestId;
	}

	recordRetrievalTime(requestId, duration) {
		const req = this.activeRequests.get(requestId);
		if (req) {
			req.retrievalTime = duration;
		}
	}

	recordGivenContext(requestId, contextText) {
		const req = this.activeRequests.get(requestId);
		if (req) {
			req.givenContext = contextText;
		}
	}

	recordLLMCall(requestId, duration, promptEvalDuration, generatedText) {
		const req = this.activeRequests.get(requestId);
		if (req) {
			req.generationTime += duration;
			req.contextProcessingTime += promptEvalDuration;
			req.generatedContext += (req.generatedContext ? '\n' : '') + generatedText;
		}
	}

	recordToolCall(requestId, { name, args, latency, latencyFromRequestStart, success, error, result }) {
		const req = this.activeRequests.get(requestId);
		if (req) {
			req.toolCalls.push({
				name,
				args,
				latency,
				latencyFromRequestStart,
				success,
				error: error || null,
				resultSummary: result ? String(result).substring(0, 200) + (String(result).length > 200 ? '...' : '') : ''
			});

			if (name === 'screenshot') {
				req.screenshotCount++;
			} else if (name === 'run_apple_script') {
				req.appleScriptCount++;
			} else if (name === 'get_ui_elements') {
				req.fetchUiCount++;
			} else if (name === 'annotate_screen') {
				req.annotateCount++;
			}
		}
	}

	async endRequest(requestId, finalSuccess, errorMsg = '') {
		const req = this.activeRequests.get(requestId);
		if (!req) return;

		req.success = finalSuccess;
		req.totalDuration = Date.now() - req.startTime;
		if (errorMsg) {
			req.error = errorMsg;
		}

		try {
			const db = getDB();
			const collection = db.collection('telemetry_logs');

			const telemetryDoc = {
				_id: req.id,
				timestamp: new Date(req.timestamp),
				prompt: req.prompt,
				success: req.success,
				totalDuration: req.totalDuration,
				retrievalTime: req.retrievalTime,
				generationTime: req.generationTime,
				contextProcessingTime: req.contextProcessingTime,
				givenContext: req.givenContext,
				generatedContext: req.generatedContext,
				screenshotCount: req.screenshotCount,
				appleScriptCount: req.appleScriptCount,
				fetchUiCount: req.fetchUiCount,
				annotateCount: req.annotateCount,
				toolCalls: req.toolCalls,
				error: req.error || null
			};

			await collection.insertOne(telemetryDoc);
			logger.info(`Telemetry metrics saved successfully to MongoDB for request: ${requestId}`);

			// Enforce 100 requests limit by deleting older logs
			const count = await collection.countDocuments();
			if (count > 100) {
				const oldestKeep = await collection.find()
					.sort({ timestamp: -1 })
					.skip(99)
					.limit(1)
					.next();
				if (oldestKeep) {
					await collection.deleteMany({ timestamp: { $lt: oldestKeep.timestamp } });
				}
			}
		} catch (error) {
			logger.error(`Failed to save telemetry metrics to MongoDB: ${error.message}`);
		} finally {
			this.activeRequests.delete(requestId);
		}
	}

	async getMetrics() {
		try {
			const db = getDB();
			const collection = db.collection('telemetry_logs');

			// Query requests sorted by timestamp descending
			const rawLogs = await collection.find()
				.sort({ timestamp: -1 })
				.toArray();

			// Format requests list matching original format
			const requests = rawLogs.map(log => ({
				id: log._id,
				timestamp: log.timestamp.toISOString(),
				prompt: log.prompt,
				success: log.success,
				totalDuration: log.totalDuration,
				retrievalTime: log.retrievalTime,
				generationTime: log.generationTime,
				contextProcessingTime: log.contextProcessingTime,
				givenContext: log.givenContext,
				generatedContext: log.generatedContext,
				screenshotCount: log.screenshotCount,
				appleScriptCount: log.appleScriptCount,
				fetchUiCount: log.fetchUiCount,
				annotateCount: log.annotateCount,
				toolCalls: log.toolCalls || []
			}));

			// Calculate aggregates dynamically
			const count = rawLogs.length;
			const aggregates = {
				totalRequests: count,
				successfulRequests: rawLogs.filter(log => log.success).length,
				failedRequests: rawLogs.filter(log => !log.success).length,
				averageTotalDuration: count > 0 ? Math.round(rawLogs.reduce((sum, log) => sum + (log.totalDuration || 0), 0) / count) : 0,
				averageRetrievalTime: count > 0 ? Math.round(rawLogs.reduce((sum, log) => sum + (log.retrievalTime || 0), 0) / count) : 0,
				averageGenerationTime: count > 0 ? Math.round(rawLogs.reduce((sum, log) => sum + (log.generationTime || 0), 0) / count) : 0,
				averageContextProcessingTime: count > 0 ? Math.round(rawLogs.reduce((sum, log) => sum + (log.contextProcessingTime || 0), 0) / count) : 0,
				totalScreenshots: rawLogs.reduce((sum, log) => sum + (log.screenshotCount || 0), 0),
				totalAppleScripts: rawLogs.reduce((sum, log) => sum + (log.appleScriptCount || 0), 0),
				totalFetchUis: rawLogs.reduce((sum, log) => sum + (log.fetchUiCount || 0), 0),
				totalAnnotations: rawLogs.reduce((sum, log) => sum + (log.annotateCount || 0), 0),
				tools: {}
			};

			// Build tool specific aggregates from nested toolCalls array
			for (const log of rawLogs) {
				const toolCalls = log.toolCalls || [];
				for (const tool of toolCalls) {
					if (!aggregates.tools[tool.name]) {
						aggregates.tools[tool.name] = {
							calls: 0,
							successes: 0,
							failures: 0,
							successRate: 0,
							averageLatency: 0,
							averageLatencyFromRequestStart: 0,
							totalLatency: 0,
							totalLatencyFromRequestStart: 0
						};
					}
					const stats = aggregates.tools[tool.name];
					stats.calls++;
					if (tool.success) {
						stats.successes++;
					} else {
						stats.failures++;
					}
					stats.successRate = Number((stats.successes / stats.calls).toFixed(4));
					
					stats.totalLatency += (tool.latency || 0);
					stats.averageLatency = Math.round(stats.totalLatency / stats.calls);

					stats.totalLatencyFromRequestStart += (tool.latencyFromRequestStart || 0);
					stats.averageLatencyFromRequestStart = Math.round(stats.totalLatencyFromRequestStart / stats.calls);
				}
			}

			// Remove temp sum properties
			for (const key of Object.keys(aggregates.tools)) {
				delete aggregates.tools[key].totalLatency;
				delete aggregates.tools[key].totalLatencyFromRequestStart;
			}

			return { requests, aggregates };
		} catch (error) {
			logger.error(`Failed to retrieve telemetry metrics from MongoDB: ${error.message}`);
			// Return empty template to avoid frontend crashes
			return {
				requests: [],
				aggregates: {
					totalRequests: 0,
					successfulRequests: 0,
					failedRequests: 0,
					averageTotalDuration: 0,
					averageRetrievalTime: 0,
					averageGenerationTime: 0,
					averageContextProcessingTime: 0,
					totalScreenshots: 0,
					totalAppleScripts: 0,
					totalFetchUis: 0,
					totalAnnotations: 0,
					tools: {}
				}
			};
		}
	}

	async clear() {
		try {
			const db = getDB();
			await db.collection('telemetry_logs').deleteMany({});
			logger.info('Telemetry metrics database cleared successfully in MongoDB.');
		} catch (error) {
			logger.error(`Failed to clear telemetry metrics database: ${error.message}`);
		}
	}
}

export const metricsService = new MetricsService();
export default metricsService;
