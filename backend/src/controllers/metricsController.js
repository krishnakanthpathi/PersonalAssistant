import { metricsService } from '../utils/metrics.js';

export const getMetrics = async (req, res) => {
	const limit = req.query.limit || 20;
	const metrics = await metricsService.getMetrics(limit);
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
