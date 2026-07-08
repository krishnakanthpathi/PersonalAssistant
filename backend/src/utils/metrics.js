import fs from 'fs';
import path from 'path';
import { logger } from './logger.js';

const METRICS_FILE_PATH = path.resolve('data/metrics.json');

class MetricsService {
	constructor() {
		this.metrics = {
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
		this.activeRequests = new Map();
		this.load();
	}

	load() {
		try {
			const dir = path.dirname(METRICS_FILE_PATH);
			if (!fs.existsSync(dir)) {
				fs.mkdirSync(dir, { recursive: true });
			}
			if (fs.existsSync(METRICS_FILE_PATH)) {
				const data = fs.readFileSync(METRICS_FILE_PATH, 'utf-8');
				this.metrics = JSON.parse(data);
				// Ensure structure is correct
				if (!this.metrics.requests) this.metrics.requests = [];
				if (!this.metrics.aggregates) this.metrics.aggregates = this.getDefaultAggregates();
			} else {
				this.save();
			}
		} catch (error) {
			logger.error(`Failed to load metrics: ${error.message}`);
		}
	}

	save() {
		try {
			fs.writeFileSync(METRICS_FILE_PATH, JSON.stringify(this.metrics, null, 2), 'utf-8');
		} catch (error) {
			logger.error(`Failed to save metrics: ${error.message}`);
		}
	}

	getDefaultAggregates() {
		return {
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
		};
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

		// Keep only the most recent 100 requests to avoid inflating file size
		this.metrics.requests.unshift(req);
		if (this.metrics.requests.length > 100) {
			this.metrics.requests = this.metrics.requests.slice(0, 100);
		}

		this.updateAggregates(req);
		this.save();
		this.activeRequests.delete(requestId);
	}

	updateAggregates(req) {
		const agg = this.metrics.aggregates || this.getDefaultAggregates();
		
		agg.totalRequests++;
		if (req.success) {
			agg.successfulRequests++;
		} else {
			agg.failedRequests++;
		}

		// Update running averages
		const n = agg.totalRequests;
		agg.averageTotalDuration = Math.round(((agg.averageTotalDuration * (n - 1)) + req.totalDuration) / n);
		agg.averageRetrievalTime = Math.round(((agg.averageRetrievalTime * (n - 1)) + req.retrievalTime) / n);
		agg.averageGenerationTime = Math.round(((agg.averageGenerationTime * (n - 1)) + req.generationTime) / n);
		agg.averageContextProcessingTime = Math.round(((agg.averageContextProcessingTime * (n - 1)) + req.contextProcessingTime) / n);

		// Specific counts
		agg.totalScreenshots += req.screenshotCount;
		agg.totalAppleScripts += req.appleScriptCount;
		agg.totalFetchUis += req.fetchUiCount;
		agg.totalAnnotations += req.annotateCount;

		// Tool-specific performance aggregation
		if (!agg.tools) agg.tools = {};
		for (const call of req.toolCalls) {
			if (!agg.tools[call.name]) {
				agg.tools[call.name] = {
					calls: 0,
					successes: 0,
					failures: 0,
					successRate: 0,
					averageLatency: 0,
					averageLatencyFromRequestStart: 0
				};
			}

			const tool = agg.tools[call.name];
			tool.calls++;
			if (call.success) {
				tool.successes++;
			} else {
				tool.failures++;
			}
			tool.successRate = Number((tool.successes / tool.calls).toFixed(4));
			
			// Running average latency
			const m = tool.calls;
			tool.averageLatency = Math.round(((tool.averageLatency * (m - 1)) + call.latency) / m);
			tool.averageLatencyFromRequestStart = Math.round(((tool.averageLatencyFromRequestStart * (m - 1)) + call.latencyFromRequestStart) / m);
		}

		this.metrics.aggregates = agg;
	}

	getMetrics() {
		return this.metrics;
	}

	clear() {
		this.metrics = {
			requests: [],
			aggregates: this.getDefaultAggregates()
		};
		this.save();
	}
}

export const metricsService = new MetricsService();
