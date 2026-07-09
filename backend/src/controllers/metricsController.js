import { metricsService } from '../utils/metrics.js';

export const getMetrics = (req, res) => {
	res.json({
		success: true,
		metrics: metricsService.getMetrics()
	});
};

export const clearMetrics = (req, res) => {
	metricsService.clear();
	res.json({
		success: true,
		message: "Metrics cleared successfully."
	});
};
