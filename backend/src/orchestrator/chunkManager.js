import { logger } from '../utils/logger.js';

// Safe character & payload limits to prevent API buffer overflow (AWS Bedrock / Mantle 2.5MB buffer limit)
const DEFAULT_MAX_CHARS = 150000; // Trigger subtask chunking if total payload > 150k chars
const DEFAULT_MAX_SUBTASK_PAYLOAD_CHARS = 1200000; // Hard limit per subtask chunk: 1.2 MB max
const DEFAULT_CHUNK_SIZE = 80000;  // ~20k tokens per text subtask
const DEFAULT_OVERLAP_SIZE = 1000;  // 1k char overlap

/**
 * Calculates total character count for prompt, history, attachments, and base64 images
 */
export function estimatePayloadCharacters(prompt = '', history = [], attachments = [], images = []) {
	let total = (prompt || '').length;

	for (const msg of history || []) {
		if (typeof msg.content === 'string') {
			total += msg.content.length;
		}
	}

	for (const att of attachments || []) {
		if (att.text) {
			total += att.text.length;
		} else if (att.content) {
			total += att.content.length;
		} else if (att.data && typeof att.data === 'string' && !att.type?.startsWith('image/')) {
			total += att.data.length;
		} else if (att.imageData && att.imageData.data) {
			total += att.imageData.data.length;
		}
	}

	for (const img of images || []) {
		if (img.data && typeof img.data === 'string') {
			total += img.data.length;
		}
	}

	return total;
}

/**
 * Determines if prompt + attachments + images payload exceeds safe context or API buffer limit
 */
export function needsChunking(prompt = '', history = [], attachments = [], images = [], maxChars = DEFAULT_MAX_CHARS) {
	const totalChars = estimatePayloadCharacters(prompt, history, attachments, images);
	const imageCount = (images || []).length;
	const exceedsChars = totalChars > maxChars;
	const exceedsImages = imageCount > 1;

	logger.info(`Payload check: ${totalChars} chars (Limit: ${maxChars}), ${imageCount} images -> Needs Chunking: ${exceedsChars || exceedsImages}`);
	return exceedsChars || exceedsImages;
}

/**
 * Breaks down large file contents, text attachments, and image batches into safe subtask chunks
 * @param {string} prompt 
 * @param {Array} attachments List of attachments with parsed text/meta
 * @param {Array} images List of image payload objects ({ type: 'image', data: base64, mimeType })
 * @param {Object} options Chunk size customization
 * @returns {Array} List of subtask chunk objects
 */
export function createSubtaskChunks(prompt, attachments = [], images = [], options = {}) {
	const chunkSize = options.chunkSize || DEFAULT_CHUNK_SIZE;
	const overlapSize = options.overlapSize || DEFAULT_OVERLAP_SIZE;
	const maxSubtaskBytes = options.maxSubtaskBytes || DEFAULT_MAX_SUBTASK_PAYLOAD_CHARS;

	// 1. Collect all text content
	const textSections = [];
	for (const att of attachments || []) {
		if (att.text || att.content) {
			textSections.push({
				name: att.name || 'Attached File',
				text: att.text || att.content
			});
		}
	}

	let fullDocumentText = '';
	for (const section of textSections) {
		fullDocumentText += `\n\n=== Attached File: ${section.name} ===\n${section.text}\n`;
	}

	if (!fullDocumentText.trim() && prompt.length > chunkSize) {
		fullDocumentText = prompt;
	}

	// 2. Chunk text document into overlapping chunks
	const textChunks = [];
	if (fullDocumentText.trim()) {
		let startIdx = 0;
		while (startIdx < fullDocumentText.length) {
			let endIdx = Math.min(startIdx + chunkSize, fullDocumentText.length);

			if (endIdx < fullDocumentText.length) {
				const newlineBreak = fullDocumentText.lastIndexOf('\n', endIdx);
				if (newlineBreak > startIdx + chunkSize * 0.7) {
					endIdx = newlineBreak + 1;
				} else {
					const spaceBreak = fullDocumentText.lastIndexOf(' ', endIdx);
					if (spaceBreak > startIdx + chunkSize * 0.7) {
						endIdx = spaceBreak + 1;
					}
				}
			}

			textChunks.push(fullDocumentText.substring(startIdx, endIdx));

			if (endIdx >= fullDocumentText.length) break;
			startIdx = endIdx - overlapSize;
		}
	}

	// 3. Dynamically batch images based on character/byte budget (max 1.2MB per subtask payload)
	const imageBatches = [];
	const allImages = [...(images || [])];
	let currentBatch = [];
	let currentBatchChars = 0;

	for (const img of allImages) {
		const imgChars = (img.data && typeof img.data === 'string') ? img.data.length : 0;
		
		// If adding this image exceeds safe payload limit (1.2MB) and current batch is non-empty, start a new batch
		if (currentBatch.length > 0 && (currentBatchChars + imgChars > maxSubtaskBytes)) {
			imageBatches.push(currentBatch);
			currentBatch = [];
			currentBatchChars = 0;
		}

		currentBatch.push(img);
		currentBatchChars += imgChars;
	}

	if (currentBatch.length > 0) {
		imageBatches.push(currentBatch);
	}

	// 4. Combine text chunks and image batches into subtask definitions
	const maxSubtaskCount = Math.max(textChunks.length, imageBatches.length, 1);
	const subtasks = [];

	for (let i = 0; i < maxSubtaskCount; i++) {
		const textChunk = textChunks[i] || (textChunks.length > 0 ? textChunks[textChunks.length - 1] : '');
		const imageBatch = imageBatches[i] || [];

		let subtaskContentDescription = textChunk;
		if (imageBatch.length > 0 && !textChunk) {
			subtaskContentDescription = `[Analyzing Image Batch ${i + 1} of ${imageBatches.length} (${imageBatch.length} image attachment(s) included)]`;
		}

		subtasks.push({
			subtaskId: i + 1,
			totalSubtasks: maxSubtaskCount,
			title: `Subtask ${i + 1} of ${maxSubtaskCount}`,
			prompt: prompt,
			chunkContent: subtaskContentDescription,
			images: imageBatch
		});
	}

	logger.info(`Generated ${subtasks.length} subtask chunks (${textChunks.length} text chunks, ${imageBatches.length} image batches).`);
	return subtasks;
}
