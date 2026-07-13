export class ToolContext {
	constructor(onProgress) {
		this.onProgressCallback = onProgress;
	}

	/**
	 * Report progress of a running tool
	 * @param {Object|string} info - Progress information
	 * @param {number} [info.progress] - Completed progress units
	 * @param {number} [info.total] - Total progress units
	 * @param {string} [info.message] - Status message
	 */
	reportProgress(info) {
		if (typeof this.onProgressCallback === 'function') {
			this.onProgressCallback(info);
		}
	}
}
