import { ocrTool } from '../tools/ocrTool.js';
import path from 'path';
import fs from 'fs';

console.log("=== Testing perform_ocr Tool ===");

// Test missing file error handling
const missingResult = await ocrTool.execute({
	filePath: "data/attachments/non_existent_ocr_image.png",
	fileName: "non_existent_ocr_image.png"
});

console.log("OCR Missing File Result:", missingResult);

if (missingResult.success !== false) {
	console.error("FAIL: perform_ocr should return success = false for missing file!");
	process.exit(1);
}

console.log("=== ALL OCR TOOL TESTS PASSED SUCCESSFULLY! ===");
process.exit(0);
