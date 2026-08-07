import { logger } from '../utils/logger.js';

export class SubtaskQueue {
	/**
	 * Process subtask chunks sequentially, passing forward accumulated context summaries
	 * @param {Array} subtasks List of chunk subtask objects
	 * @param {Object} agent Instance of Agent orchestrator
	 * @param {Array} history Chat session history
	 * @param {Object} options Handlers for SSE streaming (onStatusUpdate, shouldStop, onToken, etc.)
	 * @returns {Object} Final synthesized agent response object
	 */
	static async process(subtasks = [], agent, history = [], options = {}) {
		const {
			onStatusUpdate = null,
			shouldStop = null,
			onToken = null,
			onMetadataRetrieved = null
		} = options;

		logger.info(`Starting SubtaskQueue execution for ${subtasks.length} subtask chunks.`);

		const subtaskOutputs = [];
		const allToolExecutions = [];
		const allRagFacts = [];
		const allRelevantTools = [];
		let accumulatedContextDigest = '';

		// 1. Process each chunk subtask sequentially
		for (let i = 0; i < subtasks.length; i++) {
			const subtask = subtasks[i];
			if (shouldStop && shouldStop()) {
				throw new Error('Agent execution was stopped by user during subtask processing.');
			}

			if (onStatusUpdate) {
				onStatusUpdate(`Processing chunk ${subtask.subtaskId} of ${subtask.totalSubtasks}...`);
			}

			const subtaskPrompt = `[MULTI-CHUNK SUBTASK ${subtask.subtaskId} OF ${subtask.totalSubtasks}]
USER INTENT: ${subtask.prompt}

${accumulatedContextDigest ? `[ACCUMULATED INSIGHTS FROM PREVIOUS CHUNKS]:\n${accumulatedContextDigest}\n` : ''}
[CURRENT CONTENT CHUNK (Part ${subtask.subtaskId} of ${subtask.totalSubtasks})]:
${subtask.chunkContent}

INSTRUCTIONS FOR THIS SUBTASK:
- Analyze this chunk of content in relation to the user's intent.
- Extract any direct answers, key facts, data, or code relevant to the request.
- Summarize your findings for this chunk concisely so they can be passed forward to subsequent subtask steps and the final answer.`;

			try {
				const response = await agent.run(
					subtaskPrompt,
					history,
					onStatusUpdate,
					shouldStop,
					subtask.images || [],
					(meta) => {
						if (meta.ragFacts) allRagFacts.push(...meta.ragFacts);
						if (meta.relevantTools) allRelevantTools.push(...meta.relevantTools);
						if (onMetadataRetrieved) onMetadataRetrieved(meta);
					},
					null // Do not stream raw intermediate tokens during chunk subtasks to keep UI clean
				);

				const content = response.content || (typeof response === 'string' ? response : '');
				subtaskOutputs.push({
					subtaskId: subtask.subtaskId,
					content: content
				});

				if (response.toolExecutions) {
					allToolExecutions.push(...response.toolExecutions);
				}

				// Append to running accumulated digest (truncated to avoid exploding context in subsequent chunks)
				const conciseOutput = content.length > 3000 ? content.substring(0, 3000) + '...' : content;
				accumulatedContextDigest += `\n--- Subtask ${subtask.subtaskId} Summary ---\n${conciseOutput}\n`;

			} catch (err) {
				logger.error(`Error processing subtask ${subtask.subtaskId}: ${err.message}`);
				subtaskOutputs.push({
					subtaskId: subtask.subtaskId,
					content: `[Error processing chunk ${subtask.subtaskId}: ${err.message}]`
				});
			}
		}

		// 2. Final Synthesis Step
		if (shouldStop && shouldStop()) {
			throw new Error('Agent execution was stopped by user during final synthesis.');
		}

		if (onStatusUpdate) {
			onStatusUpdate(`Synthesizing findings across all ${subtasks.length} chunks...`);
		}

		const synthesisPrompt = `[FINAL RESPONSE SYNTHESIS]
USER REQUEST: ${subtasks[0].prompt}

You have completed analyzing ${subtasks.length} separate chunks of attached documents/files.
Below are the extracted insights and findings from each subtask chunk:

${subtaskOutputs.map(o => `=== Chunk ${o.subtaskId} Findings ===\n${o.content}`).join('\n\n')}

INSTRUCTIONS:
- Deliver a comprehensive, accurate, and perfectly organized final response to the user.
- Combine and synthesize all extracted details seamlessly into a single complete response.
- Answer all parts of the user's request using the combined findings above.`;

		// Run final synthesis step with streaming tokens enabled
		const finalResponse = await agent.run(
			synthesisPrompt,
			history,
			onStatusUpdate,
			shouldStop,
			[],
			onMetadataRetrieved,
			onToken
		);

		// Attach aggregated metadata
		if (typeof finalResponse === 'object') {
			finalResponse.toolExecutions = [
				...allToolExecutions,
				...(finalResponse.toolExecutions || [])
			];
			finalResponse.ragFacts = [
				...allRagFacts,
				...(finalResponse.ragFacts || [])
			];
			finalResponse.subtasksProcessed = subtasks.length;
		}

		logger.info(`SubtaskQueue successfully completed all ${subtasks.length} subtask chunks and synthesized final response.`);
		return finalResponse;
	}
}
