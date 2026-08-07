import { optimizeImageForVision } from '../utils/mediaProcessor.js';
import sharp from 'sharp';

console.log("=== Testing Image Optimization with Valid High-Res PNG ===");

// Create a real valid 2940x1912 PNG image in memory using sharp
const validHighResBuffer = await sharp({
	create: {
		width: 2940,
		height: 1912,
		channels: 4,
		background: { r: 255, g: 255, b: 255, alpha: 1 }
	}
})
.png()
.toBuffer();

console.log(`Original High-Res Image Size: ${(validHighResBuffer.length / 1024).toFixed(1)} KB`);

// Test optimization function
const result = await optimizeImageForVision(validHighResBuffer, 1600);
console.log(`Optimized Image Size: ${(result.optimizedSize / 1024).toFixed(1)} KB (mimeType: ${result.mimeType}, optimized: ${result.optimized})`);

if (!result.optimized) {
	console.error("FAIL: High-res 2940x1912 image should be optimized!");
	process.exit(1);
}

console.log("=== IMAGE OPTIMIZATION TESTS PASSED CLEANLY! ===");
process.exit(0);
