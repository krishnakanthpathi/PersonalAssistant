import { mediaProcessorTool } from '../tools/mediaProcessorTool.js';
import path from 'path';
import fs from 'fs';
import { env } from '../config/env.js';

console.log("=== Testing process_media Tool with Gemma4 ===");

// 1. Test missing media file handling
const missingResult = await mediaProcessorTool.execute({
	filePath: "data/attachments/missing_non_existent.png",
	fileName: "missing_non_existent.png",
	fileType: "image/png"
});

console.log("Missing File Result:", missingResult);
if (missingResult.success !== false) {
	console.error("FAIL: process_media should return success = false for missing file!");
	process.exit(1);
}

// 2. Test empty file handling
const emptyPath = path.resolve('data/attachments/empty_test.txt');
fs.writeFileSync(emptyPath, '');
const emptyResult = await mediaProcessorTool.execute({
	filePath: emptyPath,
	fileName: 'empty_test.txt',
	fileType: 'text/plain'
});
console.log("Empty File Result:", emptyResult);
if (emptyResult.success !== false) {
	console.error("FAIL: process_media should return success = false for empty file!");
	process.exit(1);
}
fs.unlinkSync(emptyPath);

// 3. Test text document processing using Gemma4
const samplePath = path.resolve('data/attachments/test_media_sample.txt');
if (!fs.existsSync(path.dirname(samplePath))) {
	fs.mkdirSync(path.dirname(samplePath), { recursive: true });
}
fs.writeFileSync(samplePath, "Project Title: AI Personal Assistant Architecture\nComponents: Orchestrator, Gemma4 Multimodal Processor, Vector Storage.\nObjective: Seamless media processing without native tool dependencies.");

const resultText = await mediaProcessorTool.execute({
	filePath: samplePath,
	fileName: "test_media_sample.txt",
	fileType: "text/plain"
});

console.log("Text File Result:", resultText);

if (!resultText.success || !resultText.modelUsed?.toLowerCase().includes('gemma4')) {
	console.error("FAIL: process_media did not succeed or did not use Gemma4 model!", resultText);
	process.exit(1);
}

// 4. Test image processing using Gemma4 vision
const sampleImageBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR42mNk+M9Qz0AEYBxVNFIkCQClLgYFFpW+4AAAAABJRU5ErkJggg==";
const sampleImagePath = path.resolve('data/attachments/test_media_image.png');
fs.writeFileSync(sampleImagePath, Buffer.from(sampleImageBase64, 'base64'));

const resultImage = await mediaProcessorTool.execute({
	filePath: sampleImagePath,
	fileName: "test_media_image.png",
	fileType: "image/png"
});

console.log("Image File Result:", resultImage);

if (!resultImage.success || resultImage.mediaType !== 'image' || !resultImage.modelUsed?.toLowerCase().includes('gemma4')) {
	console.error("FAIL: process_media failed on image with Gemma4 vision!", resultImage);
	process.exit(1);
}

// 5. Test error behavior when Ollama or Gemma4 model is not available
const originalOllamaUrl = env.OLLAMA_URL;
env.OLLAMA_URL = 'http://localhost:99999'; // Invalid unreachable URL

const unavailableResult = await mediaProcessorTool.execute({
	filePath: samplePath,
	fileName: "test_media_sample.txt",
	fileType: "text/plain"
});

console.log("Unavailable Model Result:", unavailableResult);
if (unavailableResult.success !== false || !unavailableResult.error.includes('Gemma4 model is not available')) {
	console.error("FAIL: process_media must return error when Gemma4 model is unavailable!", unavailableResult);
	process.exit(1);
}

// Restore URL
env.OLLAMA_URL = originalOllamaUrl;

// Cleanup
try {
	if (fs.existsSync(samplePath)) fs.unlinkSync(samplePath);
	if (fs.existsSync(sampleImagePath)) fs.unlinkSync(sampleImagePath);
} catch (e) {}

console.log("\n=== ALL process_media GEMMA4 TESTS PASSED SUCCESSFULLY! ===");
process.exit(0);
