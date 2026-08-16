import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { glmOcrTool } from '../tools/glmOcrTool.js';
import { registry } from '../orchestrator/registry.js';
import { logger } from '../utils/logger.js';

async function runTest() {
	console.log('=== Starting GLM-OCR Tool Verification ===\n');

	// 1. Verify Tool Registration
	console.log('1. Checking Tool Registry...');
	const registeredTool = registry.tools.get('glm_ocr');
	if (!registeredTool) {
		throw new Error('glm_ocr is not registered in ToolRegistry!');
	}
	console.log('✓ glm_ocr is registered in ToolRegistry.\n');

	// 2. Generate a test PNG image with text using Sharp
	console.log('2. Generating test image with text and table...');
	const svgImage = `
	<svg width="600" height="300" xmlns="http://www.w3.org/2000/svg">
		<rect width="100%" height="100%" fill="#ffffff"/>
		<text x="30" y="50" font-family="Helvetica, Arial, sans-serif" font-size="28" font-weight="bold" fill="#000000">INVOICE #INV-2026-001</text>
		<text x="30" y="100" font-family="Helvetica, Arial, sans-serif" font-size="18" fill="#333333">Customer: ACME Corporation</text>
		<text x="30" y="130" font-family="Helvetica, Arial, sans-serif" font-size="18" fill="#333333">Item: Cloud AI Infrastructure Plan</text>
		<text x="30" y="160" font-family="Helvetica, Arial, sans-serif" font-size="18" fill="#333333">Quantity: 1</text>
		<text x="30" y="190" font-family="Helvetica, Arial, sans-serif" font-size="18" fill="#333333">Amount: $4,096.00</text>
		<text x="30" y="240" font-family="Helvetica, Arial, sans-serif" font-size="16" fill="#666666">Thank you for your business!</text>
	</svg>
	`;

	const testImgPath = path.resolve('data/attachments/test_invoice.png');
	if (!fs.existsSync(path.dirname(testImgPath))) {
		fs.mkdirSync(path.dirname(testImgPath), { recursive: true });
	}

	await sharp(Buffer.from(svgImage))
		.png()
		.toFile(testImgPath);

	console.log(`✓ Test image created at: ${testImgPath}\n`);

	// 3. Test Text Recognition
	console.log('3. Testing "text" task type (Text Recognition:)...');
	const textResult = await glmOcrTool.execute({
		filePath: testImgPath,
		taskType: 'text'
	});

	console.log('Text Result Status:', textResult.success ? 'SUCCESS' : 'FAILED');
	console.log('Task Prefix Applied:', textResult.taskPrefix);
	console.log('Latency:', `${textResult.latencyMs}ms`);
	console.log('Extracted Text:\n---\n' + textResult.extractedText + '\n---');

	if (!textResult.success) {
		console.error('Error:', textResult.error);
	}

	// 4. Test Table Recognition
	console.log('\n4. Testing "table" task type (Table Recognition:)...');
	const tableResult = await glmOcrTool.execute({
		filePath: testImgPath,
		taskType: 'table'
	});

	console.log('Table Result Status:', tableResult.success ? 'SUCCESS' : 'FAILED');
	console.log('Task Prefix Applied:', tableResult.taskPrefix);
	console.log('Latency:', `${tableResult.latencyMs}ms`);
	console.log('Extracted Table:\n---\n' + tableResult.extractedText + '\n---');

	// 5. Test JSON Mode
	console.log('\n5. Testing native JSON mode (format: "json")...');
	const jsonResult = await glmOcrTool.execute({
		filePath: testImgPath,
		taskType: 'text',
		format: 'json'
	});

	console.log('JSON Result Status:', jsonResult.success ? 'SUCCESS' : 'FAILED');
	console.log('Latency:', `${jsonResult.latencyMs}ms`);
	console.log('Extracted JSON Data:', jsonResult.data ? JSON.stringify(jsonResult.data, null, 2) : jsonResult.extractedText);

	// 6. Test RAG / Registry Tool Retrieval
	console.log('\n6. Testing RAG tool retrieval for OCR query...');
	const retrievedTools = await registry.getRelevantTools('perform OCR on scanned invoice image and extract text');
	const found = retrievedTools.some(t => (t.name === 'glm_ocr' || t.function?.name === 'glm_ocr'));
	console.log('Tool retrieval found glm_ocr:', found ? 'YES' : 'NO');

	// 7. Clean up temporary test file
	try {
		if (fs.existsSync(testImgPath)) {
			fs.unlinkSync(testImgPath);
		}
	} catch (e) {}

	console.log('\n=== GLM-OCR Tool Verification Finished ===');
}

runTest().catch(err => {
	console.error('Test execution failed:', err);
	process.exit(1);
});
