import { db } from './db.js';
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

	endRequest(requestId, finalSuccess, errorMsg = '') {
		const req = this.activeRequests.get(requestId);
		if (!req) return;

		req.success = finalSuccess;
		req.totalDuration = Date.now() - req.startTime;
		if (errorMsg) {
			req.error = errorMsg;
		}

		try {
			// Start transaction for atomic writes
			const insertLog = db.prepare(`
				INSERT INTO telemetry_logs (
					id, timestamp, prompt, success, total_duration, retrieval_time, 
					generation_time, context_processing_time, given_context, generated_context, 
					screenshot_count, apple_script_count, fetch_ui_count, annotate_count
				) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
			`);

			const insertTool = db.prepare(`
				INSERT INTO tool_calls (
					request_id, name, args, latency, success, error
				) VALUES (?, ?, ?, ?, ?, ?)
			`);

			const executeTransaction = db.transaction((request, toolsList) => {
				insertLog.run(
					request.id,
					request.timestamp,
					request.prompt,
					request.success ? 1 : 0,
					request.totalDuration,
					request.retrievalTime,
					request.generationTime,
					request.contextProcessingTime,
					request.givenContext,
					request.generatedContext,
					request.screenshotCount,
					request.appleScriptCount,
					request.fetchUiCount,
					request.annotateCount
				);

				for (const tool of toolsList) {
					insertTool.run(
						request.id,
						tool.name,
						JSON.stringify(tool.args || {}),
						tool.latency,
						tool.success ? 1 : 0,
						tool.error || null
					);
				}

				// Enforce 100 requests limit by deleting older logs
				db.prepare(`
					DELETE FROM telemetry_logs 
					WHERE id NOT IN (
						SELECT id FROM telemetry_logs 
						ORDER BY timestamp DESC 
						LIMIT 100
					)
				`).run();
			});

			executeTransaction(req, req.toolCalls);
			logger.info(`Telemetry metrics saved successfully to SQLite for request: ${requestId}`);
		} catch (error) {
			logger.error(`Failed to save telemetry metrics to SQLite: ${error.message}`);
		} finally {
			this.activeRequests.delete(requestId);
		}
	}

	getMetrics() {
		try {
			// Query requests
			const rawLogs = db.prepare(`
				SELECT * FROM telemetry_logs 
				ORDER BY timestamp DESC
			`).all();

			const rawTools = db.prepare(`
				SELECT * FROM tool_calls
			`).all();

			// Group tool calls by request_id
			const toolCallsMap = new Map();
			for (const tool of rawTools) {
				if (!toolCallsMap.has(tool.request_id)) {
					toolCallsMap.set(tool.request_id, []);
				}
				toolCallsMap.get(tool.request_id).push({
					name: tool.name,
					args: JSON.parse(tool.args || '{}'),
					latency: tool.latency,
					success: tool.success === 1,
					error: tool.error
				});
			}

			// Format requests list matching original format
			const requests = rawLogs.map(log => ({
				id: log.id,
				timestamp: log.timestamp,
				prompt: log.prompt,
				success: log.success === 1,
				totalDuration: log.total_duration,
				retrievalTime: log.retrieval_time,
				generationTime: log.generation_time,
				contextProcessingTime: log.context_processing_time,
				givenContext: log.given_context,
				generatedContext: log.generated_context,
				screenshotCount: log.screenshot_count,
				appleScriptCount: log.apple_script_count,
				fetchUiCount: log.fetch_ui_count,
				annotateCount: log.annotate_count,
				toolCalls: toolCallsMap.get(log.id) || []
			}));

			// Calculate aggregates dynamically
			const count = rawLogs.length;
			const aggregates = {
				totalRequests: count,
				successfulRequests: rawLogs.filter(log => log.success === 1).length,
				failedRequests: rawLogs.filter(log => log.success === 0).length,
				averageTotalDuration: count > 0 ? Math.round(rawLogs.reduce((sum, log) => sum + log.total_duration, 0) / count) : 0,
				averageRetrievalTime: count > 0 ? Math.round(rawLogs.reduce((sum, log) => sum + log.retrieval_time, 0) / count) : 0,
				averageGenerationTime: count > 0 ? Math.round(rawLogs.reduce((sum, log) => sum + log.generation_time, 0) / count) : 0,
				averageContextProcessingTime: count > 0 ? Math.round(rawLogs.reduce((sum, log) => sum + log.context_processing_time, 0) / count) : 0,
				totalScreenshots: rawLogs.reduce((sum, log) => sum + log.screenshot_count, 0),
				totalAppleScripts: rawLogs.reduce((sum, log) => sum + log.apple_script_count, 0),
				totalFetchUis: rawLogs.reduce((sum, log) => sum + log.fetch_ui_count, 0),
				totalAnnotations: rawLogs.reduce((sum, log) => sum + log.annotate_count, 0),
				tools: {}
			};

			// Build tool specific aggregates
			for (const tool of rawTools) {
				if (!aggregates.tools[tool.name]) {
					aggregates.tools[tool.name] = {
						calls: 0,
						successes: 0,
						failures: 0,
						successRate: 0,
						averageLatency: 0
					};
				}
				const stats = aggregates.tools[tool.name];
				stats.calls++;
				if (tool.success === 1) {
					stats.successes++;
				} else {
					stats.failures++;
				}
				stats.successRate = Number((stats.successes / stats.calls).toFixed(4));
				
				// Re-calculate running latency sum to compute average
				stats.totalLatency = (stats.totalLatency || 0) + tool.latency;
				stats.averageLatency = Math.round(stats.totalLatency / stats.calls);
			}

			// Remove temp sum properties
			for (const key of Object.keys(aggregates.tools)) {
				delete aggregates.tools[key].totalLatency;
			}

			return { requests, aggregates };
		} catch (error) {
			logger.error(`Failed to retrieve telemetry metrics from SQLite: ${error.message}`);
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

	clear() {
		try {
			db.prepare(`DELETE FROM telemetry_logs`).run();
			logger.info('Telemetry metrics database cleared successfully.');
		} catch (error) {
			logger.error(`Failed to clear telemetry metrics database: ${error.message}`);
		}
	}
}

export const metricsService = new MetricsService();
