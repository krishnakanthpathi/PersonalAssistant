import { getDB } from '../config/mongodb.js';
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
				resultSummary: result ? String(result).substring(0, 200) + (String(result).length > 200 ? '...' : '') : '',
				result: result || null
			});

			if (name === 'screenshot') {
				req.screenshotCount++;
			} else if (name === 'run_apple_script') {
				req.appleScriptCount++;
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

		const generatedText = req.generatedContext || '';
		const tokenCount = Math.round(generatedText.length / 4);
		const genSeconds = (req.generationTime || 0) / 1000;
		const tokensPerSecond = genSeconds > 0 && tokenCount > 0 ? parseFloat((tokenCount / genSeconds).toFixed(1)) : 0;

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
				tokenCount,
				tokensPerSecond,
				screenshotCount: req.screenshotCount,
				appleScriptCount: req.appleScriptCount,
				toolCalls: req.toolCalls,
				error: req.error || null
			};

			await collection.insertOne(telemetryDoc);
			logger.info(`Telemetry metrics saved successfully to MongoDB for request: ${requestId} (${tokensPerSecond} tokens/sec)`);

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

	async getMetrics(limit = 20) {
		try {
			const db = getDB();
			const collection = db.collection('telemetry_logs');
			const parsedLimit = Math.max(1, Math.min(100, parseInt(limit) || 20));

			// Project lightweight log fields across all documents for accurate aggregates
			const allLogs = await collection.find({}, {
				projection: {
					_id: 1,
					timestamp: 1,
					success: 1,
					totalDuration: 1,
					retrievalTime: 1,
					generationTime: 1,
					contextProcessingTime: 1,
					tokenCount: 1,
					tokensPerSecond: 1,
					generatedContext: 1,
					screenshotCount: 1,
					appleScriptCount: 1,
					toolCalls: 1
				}
			}).toArray();

			const count = allLogs.length;
			let successfulRequests = 0;
			let failedRequests = 0;
			let sumTotalDuration = 0;
			let sumRetrievalTime = 0;
			let sumGenerationTime = 0;
			let sumContextProcessingTime = 0;
			let totalTokensGenerated = 0;
			let totalScreenshots = 0;
			let totalAppleScripts = 0;
			let totalToolCallsCount = 0;
			let totalToolLatencySum = 0;

			const tools = {};

			for (const log of allLogs) {
				if (log.success) {
					successfulRequests++;
				} else {
					failedRequests++;
				}

				const logTokens = log.tokenCount || Math.round((log.generatedContext || '').length / 4);
				totalTokensGenerated += logTokens;

				sumTotalDuration += (log.totalDuration || 0);
				sumRetrievalTime += (log.retrievalTime || 0);
				sumGenerationTime += (log.generationTime || 0);
				sumContextProcessingTime += (log.contextProcessingTime || 0);
				totalScreenshots += (log.screenshotCount || 0);
				totalAppleScripts += (log.appleScriptCount || 0);

				const toolCalls = log.toolCalls || [];
				for (const tool of toolCalls) {
					totalToolCallsCount++;
					totalToolLatencySum += (tool.latency || 0);

					if (!tools[tool.name]) {
						tools[tool.name] = {
							calls: 0,
							successes: 0,
							failures: 0,
							successRate: 0,
							averageLatency: 0,
							totalLatency: 0
						};
					}
					const stats = tools[tool.name];
					stats.calls++;
					if (tool.success) {
						stats.successes++;
					} else {
						stats.failures++;
					}
					stats.totalLatency += (tool.latency || 0);
				}
			}

			// Finalize per-tool calculations
			for (const key of Object.keys(tools)) {
				const stats = tools[key];
				stats.successRate = stats.calls > 0 ? Math.round((stats.successes / stats.calls) * 100) : 0;
				stats.averageLatency = stats.calls > 0 ? Math.round(stats.totalLatency / stats.calls) : 0;
				delete stats.totalLatency;
			}

			const totalGenSec = sumGenerationTime / 1000;
			const averageTokensPerSecond = totalGenSec > 0 ? parseFloat((totalTokensGenerated / totalGenSec).toFixed(1)) : 0;

			const aggregates = {
				totalRequests: count,
				successfulRequests,
				failedRequests,
				successRate: count > 0 ? Math.round((successfulRequests / count) * 100) : 100,
				averageTotalDuration: count > 0 ? Math.round(sumTotalDuration / count) : 0,
				averageRetrievalTime: count > 0 ? Math.round(sumRetrievalTime / count) : 0,
				averageGenerationTime: count > 0 ? Math.round(sumGenerationTime / count) : 0,
				averageContextProcessingTime: count > 0 ? Math.round(sumContextProcessingTime / count) : 0,
				averageToolExecutionTime: totalToolCallsCount > 0 ? Math.round(totalToolLatencySum / totalToolCallsCount) : 0,
				averageTokensPerSecond,
				totalTokensGenerated,
				totalScreenshots,
				totalAppleScripts,
				tools
			};

			// Query limited recent logs for detailed table display
			const recentRawLogs = await collection.find()
				.sort({ timestamp: -1 })
				.limit(parsedLimit)
				.toArray();

			const requests = recentRawLogs.map(log => {
				const tokenCount = log.tokenCount || Math.round((log.generatedContext || '').length / 4);
				const genSec = (log.generationTime || 0) / 1000;
				const tokensPerSecond = log.tokensPerSecond || (genSec > 0 && tokenCount > 0 ? parseFloat((tokenCount / genSec).toFixed(1)) : 0);

				return {
					id: log._id,
					timestamp: log.timestamp ? log.timestamp.toISOString() : new Date().toISOString(),
					prompt: log.prompt ? (log.prompt.length > 200 ? log.prompt.substring(0, 200) + '...' : log.prompt) : '',
					success: log.success === true,
					totalDuration: log.totalDuration || 0,
					retrievalTime: log.retrievalTime || 0,
					generationTime: log.generationTime || 0,
					contextProcessingTime: log.contextProcessingTime || 0,
					tokenCount,
					tokensPerSecond,
					toolCallsCount: (log.toolCalls || []).length,
					toolCalls: (log.toolCalls || []).map(tc => ({
						name: tc.name,
						latency: tc.latency || 0,
						success: tc.success === true,
						error: tc.error || null,
						resultSummary: tc.resultSummary || (tc.result ? String(tc.result).substring(0, 120) : '')
					})),
					error: log.error || null
				};
			});

			return { limit: parsedLimit, totalLogs: count, requests, aggregates };
		} catch (error) {
			logger.error(`Failed to retrieve telemetry metrics from MongoDB: ${error.message}`);
			return {
				limit: 20,
				totalLogs: 0,
				requests: [],
				aggregates: {
					totalRequests: 0,
					successfulRequests: 0,
					failedRequests: 0,
					successRate: 100,
					averageTotalDuration: 0,
					averageRetrievalTime: 0,
					averageGenerationTime: 0,
					averageContextProcessingTime: 0,
					averageToolExecutionTime: 0,
					totalScreenshots: 0,
					totalAppleScripts: 0,
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
