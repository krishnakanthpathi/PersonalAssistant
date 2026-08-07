import { logger } from '../utils/logger.js';

export class SubtaskQueue {
	/**
	 * Process subtask chunks sequentially, maintaining cumulative process history and achieved outputs
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
		
		// Maintain a growing process history including prior chat history + completed subtask outputs
		const processHistory = [...(history || [])];

		// 1. Process each chunk subtask sequentially
		for (let i = 0; i < subtasks.length; i++) {
			const subtask = subtasks[i];
			if (shouldStop && shouldStop()) {
				throw new Error('Agent execution was stopped by user during subtask processing.');
			}

			if (onStatusUpdate) {
				onStatusUpdate(`Processing chunk ${subtask.subtaskId} of ${subtask.totalSubtasks}...`);
			}

			// Build history summary of outputs achieved by previous subtasks
			let achievedOutputsSummary = '';
			if (subtaskOutputs.length > 0) {
				achievedOutputsSummary = '[OUTPUTS ACHIEVED BY PREVIOUS SUBTASKS]:\n' +
					subtaskOutputs.map(o => {
						const concise = o.content.length > 2000 ? o.content.substring(0, 2000) + '...' : o.content;
						return `• Subtask ${o.subtaskId} Output:\n${concise}`;
					}).join('\n\n') + '\n';
			}

			const subtaskPrompt = `[MULTI-CHUNK SUBTASK ${subtask.subtaskId} OF ${subtask.totalSubtasks}]
USER INTENT: ${subtask.prompt}

${achievedOutputsSummary}
[CURRENT CONTENT CHUNK (Part ${subtask.subtaskId} of ${subtask.totalSubtasks})]:
${subtask.chunkContent}

INSTRUCTIONS FOR THIS SUBTASK:
- Analyze this chunk of content in relation to the user's intent and previous subtask outputs achieved.
- Extract any direct answers, key facts, data, or code relevant to the request.
- Summarize your findings and outputs achieved for this chunk concisely so they are included in the process history for subsequent subtasks and final answer.`;

			try {
				const response = await agent.run(
					subtaskPrompt,
					processHistory,
					onStatusUpdate,
					shouldStop,
					subtask.images || [],
					(meta) => {
						if (meta.ragFacts) allRagFacts.push(...meta.ragFacts);
						if (meta.relevantTools) allRelevantTools.push(...meta.relevantTools);
						if (onMetadataRetrieved) onMetadataRetrieved(meta);
					},
					null // Do not stream raw intermediate tokens during subtasks
				);

				const content = response.content || (typeof response === 'string' ? response : '');
				subtaskOutputs.push({
					subtaskId: subtask.subtaskId,
					content: content,
					speech: response.speech || null
				});

				if (response.toolExecutions) {
					allToolExecutions.push(...response.toolExecutions);
				}

				// Append this subtask step into process history so subsequent subtask steps have full awareness
				processHistory.push({
					role: 'user',
					content: `Subtask ${subtask.subtaskId}/${subtask.totalSubtasks} analysis request: ${subtask.prompt}`
				});

				let assistantProcessContent = content;
				if (response.speech) {
					assistantProcessContent = `<speech>\n${response.speech}\n</speech>\n<action>\n${content}\n</action>`;
				}
				processHistory.push({
					role: 'assistant',
					content: assistantProcessContent,
					speech: response.speech || null
				});

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

You have completed analyzing ${subtasks.length} separate subtasks/chunks.
Below is the summary of outputs achieved across all subtasks in this process:

${subtaskOutputs.map(o => `=== Subtask ${o.subtaskId} Achieved Output ===\n${o.content}`).join('\n\n')}

INSTRUCTIONS:
- Deliver a comprehensive, accurate, and perfectly organized final response to the user.
- Combine and synthesize all outputs achieved seamlessly into a single complete response.
- If speech text is appropriate, format it inside <speech>...</speech> tags without invoking any tool calls.`;

		// Run final synthesis step with streaming tokens enabled using cumulative process history
		const finalResponse = await agent.run(
			synthesisPrompt,
			processHistory,
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
