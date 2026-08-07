import { estimatePayloadCharacters, needsChunking, createSubtaskChunks } from '../orchestrator/chunkManager.js';
import { SubtaskQueue } from '../orchestrator/subtaskQueue.js';

console.log("=== Testing ChunkManager and SubtaskQueue ===");

// Test Case 1: Large Document Text
let largeText = "";
for (let i = 0; i < 5000; i++) {
	largeText += `Line ${i + 1}: This is sample document content for testing context overflow chunking.\n`;
}

const mockAttachments = [
	{
		name: "large_doc.txt",
		type: "text/plain",
		text: largeText
	}
];

const prompt = "Summarize all lines in this document.";
const history = [];

const totalChars = estimatePayloadCharacters(prompt, history, mockAttachments);
console.log(`Test 1 - Document Payload Chars: ${totalChars}`);
const isChunkingNeeded1 = needsChunking(prompt, history, mockAttachments, [], 100000);
console.log(`Test 1 - Needs Chunking: ${isChunkingNeeded1}`);
if (!isChunkingNeeded1) {
	console.error("FAIL: Expected Test 1 needsChunking to return true!");
	process.exit(1);
}

// Test Case 2: Multi-Image Payload (17 images, matching user scenario)
const mock17Images = [];
const dummyBase64 = "A".repeat(800000); // 800KB base64 string per image
for (let i = 0; i < 17; i++) {
	mock17Images.push({
		type: 'image',
		data: dummyBase64,
		mimeType: 'image/png',
		name: `image_${i + 1}.png`
	});
}

const totalImageChars = estimatePayloadCharacters("extract content", [], [], mock17Images);
console.log(`Test 2 - 17 Images Payload Chars: ${totalImageChars}`);
const isChunkingNeeded2 = needsChunking("extract content", [], [], mock17Images, 200000, 3);
console.log(`Test 2 - Needs Chunking (Limit 3 images): ${isChunkingNeeded2}`);

if (!isChunkingNeeded2) {
	console.error("FAIL: Expected Test 2 needsChunking to return true for 17 images!");
	process.exit(1);
}

const imageSubtasks = createSubtaskChunks("extract content", [], mock17Images, { imagesPerChunk: 3 });
console.log(`Test 2 - Subtasks Created for 17 Images: ${imageSubtasks.length}`);
imageSubtasks.forEach(s => {
	console.log(` - Subtask ${s.subtaskId}/${s.totalSubtasks}: Images attached=${s.images.length}`);
});

if (imageSubtasks.length !== 17) {
	console.error(`FAIL: Expected 17 subtasks for 17 large images (1 image per subtask due to 1.2MB limit), got ${imageSubtasks.length}`);
	process.exit(1);
}

// Test SubtaskQueue execution on 17 images
const mockAgent = {
	run: async (subtaskPrompt, history, onStatusUpdate, shouldStop, images, onMeta, onToken) => {
		if (onStatusUpdate) onStatusUpdate(`Processing images batch (${images.length} images)...`);
		return {
			content: `Extracted features from ${images.length} images.`,
			toolExecutions: []
		};
	}
};

const statusLogs = [];
const result = await SubtaskQueue.process(imageSubtasks, mockAgent, history, {
	onStatusUpdate: (msg) => statusLogs.push(typeof msg === 'string' ? msg : JSON.stringify(msg)),
});

console.log("Test 2 - Final Synthesis Output:", result.content);
console.log("=== ALL TESTS PASSED SUCCESSFULLY! ===");
process.exit(0);
