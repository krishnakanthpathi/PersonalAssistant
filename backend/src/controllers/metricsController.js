import { metricsService } from '../utils/metrics.js';

export const getMetrics = async (req, res) => {
	const metrics = await metricsService.getMetrics();
	res.json({
		success: true,
		metrics
	});
};

export const clearMetrics = async (req, res) => {
	await metricsService.clear();
	res.json({
		success: true,
		message: "Metrics cleared successfully."
	});
};
