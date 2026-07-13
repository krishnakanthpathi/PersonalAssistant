const activeTasks = new Map();

/**
 * Updates the progress of an MCP background task
 */
export const updateMcpProgress = (req, res) => {
	const { server, taskId, progress, total, status, message } = req.body;
	
	if (!server || !taskId) {
		return res.status(400).json({ error: "server and taskId are required" });
	}

	if (status === 'finished' || status === 'failed') {
		activeTasks.set(taskId, {
			server,
			taskId,
			progress: progress ?? 100,
			total: total ?? 100,
			status,
			message,
			updatedAt: Date.now()
		});
		
		// Clean up task after 2 minutes
		setTimeout(() => {
			activeTasks.delete(taskId);
		}, 120000);
	} else {
		activeTasks.set(taskId, {
			server,
			taskId,
			progress,
			total,
			status: status || 'running',
			message,
			updatedAt: Date.now()
		});
	}

	res.json({ success: true });
};

/**
 * Returns all active background tasks across MCP servers
 */
export const getMcpStatus = (req, res) => {
	const tasks = Array.from(activeTasks.values());
	res.json({ tasks });
};
