import { mediaProcessorTool } from '../tools/mediaProcessorTool.js';
import path from 'path';
import fs from 'fs';

console.log("=== Testing process_media Tool ===");

// 1. Create a sample media text file
const samplePath = path.resolve('data/attachments/test_media_sample.txt');
if (!fs.existsSync(path.dirname(samplePath))) {
	fs.mkdirSync(path.dirname(samplePath), { recursive: true });
}
fs.writeFileSync(samplePath, "Sample media content for testing process_media tool.");

const resultText = await mediaProcessorTool.execute({
	filePath: samplePath,
	fileName: "test_media_sample.txt",
	fileType: "text/plain"
});

console.log("process_media Text Result:", resultText);

if (!resultText.success || resultText.mediaType !== 'text') {
	console.error("FAIL: process_media failed on text file!");
	process.exit(1);
}

// 2. Test missing media file handling
const missingResult = await mediaProcessorTool.execute({
	filePath: "data/attachments/missing_media.png",
	fileName: "missing_media.png",
	fileType: "image/png"
});

console.log("process_media Missing File Result:", missingResult);

if (missingResult.success !== false) {
	console.error("FAIL: process_media should return success = false for missing file!");
	process.exit(1);
}

console.log("=== ALL process_media TESTS PASSED SUCCESSFULLY! ===");
process.exit(0);
