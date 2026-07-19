import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { logger } from './logger.js';

const execAsync = promisify(exec);

/**
 * Safely evaluates and executes a custom skill with provided arguments.
 * 
 * @param {object} skill - The skill object from MongoDB
 * @param {object} args - Arguments passed by the LLM reasoning loop
 * @param {object} toolContext - Context of the tool from the orchestrator
 * @returns {Promise<any>} The result of the skill execution
 */
export async function executeDynamicSkill(skill, args, toolContext = null) {
	const context = {
		exec,
		execAsync,
		fs,
		path,
		logger,
		fetch: global.fetch,
		toolContext
	};

	try {
		// Expect the skill code to be a complete async arrow function or function:
		// e.g., "async (args, context) => { ... }"
		let compiledFn;
		const trimmedCode = skill.code.trim();

		// Check if it's already an arrow function or standard function
		if (trimmedCode.startsWith('async') || trimmedCode.startsWith('function') || trimmedCode.startsWith('(')) {
			compiledFn = (0, eval)(`(${trimmedCode})`);
		} else {
			// Fallback: If it's just a body, wrap it in an async arrow function
			compiledFn = (0, eval)(`(async (args, context) => {\n${trimmedCode}\n})`);
		}

		if (typeof compiledFn !== 'function') {
			throw new Error('Skill code does not evaluate to a function');
		}

		logger.info(`Running compiled custom skill: ${skill.name}`);
		const result = await compiledFn(args, context);
		
		if (result === undefined) {
			return `Skill ${skill.name} executed successfully with no return value.`;
		}
		
		if (typeof result === 'object') {
			return JSON.stringify(result, null, 2);
		}

		return String(result);
	} catch (error) {
		logger.error(`Error executing skill ${skill.name}: ${error.message}`);
		throw new Error(`[Skill Execution Error] ${error.message}`);
	}
}
