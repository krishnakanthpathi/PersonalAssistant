import { attachmentProcessorTool } from '../tools/attachmentProcessorTool.js';
import path from 'path';
import fs from 'fs';

console.log("=== Testing attachmentProcessorTool ===");

// 1. Create a temporary sample text file
const sampleTextPath = path.resolve('data/attachments/test_sample.txt');
if (!fs.existsSync(path.dirname(sampleTextPath))) {
	fs.mkdirSync(path.dirname(sampleTextPath), { recursive: true });
}
fs.writeFileSync(sampleTextPath, "Hello world!\nLine 2 of test data.\nLine 3 of test data.");

const resultText = await attachmentProcessorTool.execute({
	filePath: sampleTextPath,
	fileName: "test_sample.txt",
	fileType: "text/plain"
});

console.log("Text File Execution Result:", resultText);

if (!resultText.success || resultText.lineCount !== 3) {
	console.error("FAIL: Text file processing failed!");
	process.exit(1);
}

// 2. Test missing file error handling
const missingResult = await attachmentProcessorTool.execute({
	filePath: "data/attachments/non_existent_file.pdf",
	fileName: "non_existent_file.pdf"
});

console.log("Missing File Result:", missingResult);

if (missingResult.success !== false) {
	console.error("FAIL: Missing file handling should return success = false!");
	process.exit(1);
}

console.log("=== ALL ATTACHMENT PROCESSOR TESTS PASSED! ===");
process.exit(0);
