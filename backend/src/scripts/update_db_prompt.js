import { connectToMongoDB, getDB } from '../config/mongodb.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function run() {
	try {
		console.log("Connecting to MongoDB...");
		await connectToMongoDB();
		const db = getDB();
		
		const filePath = path.join(__dirname, '../config/system_prompt.md');
		const newPrompt = await fs.promises.readFile(filePath, 'utf8');
		
		const collection = db.collection('system_prompts');
		const activeDoc = await collection.findOne({ isActive: true });
		
		if (activeDoc) {
			console.log("Found active system prompt in MongoDB. Updating it...");
			await collection.updateOne({ _id: activeDoc._id }, { $set: { prompt: newPrompt } });
			console.log("Successfully updated active system prompt in MongoDB.");
		} else {
			console.log("No active system prompt found in MongoDB. Inserting...");
			await collection.insertOne({
				prompt: newPrompt,
				isActive: true,
				createdAt: new Date()
			});
			console.log("Successfully inserted new active system prompt in MongoDB.");
		}
	} catch (err) {
		console.error("Error updating system prompt:", err);
	} finally {
		console.log("Exiting script...");
		process.exit(0);
	}
}

run();
