import { exec } from 'child_process';
import { promisify } from 'util';
import { runAppleScript } from '../../utils/appleScript.js';
import { catchErrors } from '../../utils/errors.js';
import { logger } from '../../utils/logger.js';
import path from 'path';

const execAsync = promisify(exec);

// Helper to run Swift code from stdin
async function runSwiftCode(code, args = []) {
	return new Promise((resolve, reject) => {
		const formattedArgs = args.map(arg => `"${arg.replace(/"/g, '\\"')}"`).join(' ');
		const child = exec(`swift - ${formattedArgs}`);
		let output = '';
		let errorOutput = '';

		child.stdout.on('data', d => output += d);
		child.stderr.on('data', d => errorOutput += d);

		child.stdin.write(code);
		child.stdin.end();

		child.on('close', code => {
			if (code === 0) {
				resolve(output);
			} else {
				reject(new Error(errorOutput || `Swift process exited with code ${code}`));
			}
		});
	});
}

export const revealInFinderTool = {
	definition: {
		name: 'reveal_in_finder',
		description: 'Reveal a file or directory in Finder.',
		parameters: {
			type: 'object',
			properties: {
				path: { type: 'string', description: 'The absolute path to the file or folder.' }
			},
			required: ['path']
		}
	},
	execute: catchErrors(async ({ path: targetPath }) => {
		const resolved = path.resolve(targetPath);
		logger.info(`Revealing in Finder: ${resolved}`);
		await execAsync(`open -R "${resolved.replace(/"/g, '\\"')}"`);
		return `Revealed "${targetPath}" in Finder.`;
	}, 'Failed to reveal in Finder')
};

export const getFinderSelectionTool = {
	definition: {
		name: 'get_finder_selection',
		description: 'Return the current Finder selection as an array of file URLs.',
		parameters: {
			type: 'object',
			properties: {}
		}
	},
	execute: catchErrors(async () => {
		logger.info('Fetching Finder selection...');
		const script = `
			tell application "Finder"
				set selectionList to selection
				set outputText to ""
				repeat with itemRef in selectionList
					set outputText to outputText & POSIX path of (itemRef as text) & "\\n"
				end repeat
				return outputText
			end tell
		`;
		const result = await runAppleScript(script);
		if (!result || result.trim() === '') return JSON.stringify([]);
		const fileUrls = result.trim().split('\n').map(p => `file://${p}`);
		return JSON.stringify(fileUrls, null, 2);
	}, 'Failed to get Finder selection')
};

export const setFinderTagsTool = {
	definition: {
		name: 'set_finder_tags',
		description: 'Set Finder tags on one or more files.',
		parameters: {
			type: 'object',
			properties: {
				paths: { type: 'array', items: { type: 'string' }, description: 'Array of file paths.' },
				tags: { type: 'array', items: { type: 'string' }, description: 'Array of tag names.' }
			},
			required: ['paths', 'tags']
		}
	},
	execute: catchErrors(async ({ paths, tags }) => {
		logger.info(`Setting Finder tags [${tags.join(', ')}] on ${paths.length} files`);
		const resolvedPaths = paths.map(p => path.resolve(p));
		
		const swiftCode = `
			import Cocoa
			guard CommandLine.arguments.count >= 2,
			      let data = CommandLine.arguments[1].data(using: .utf8),
			      let json = try? JSONSerialization.jsonObject(with: data, options: []) as? [String: Any],
			      let paths = json["paths"] as? [String],
			      let tags = json["tags"] as? [String] else {
				exit(1)
			}
			for p in paths {
				let url = URL(fileURLWithPath: p)
				try? (url as NSURL).setResourceValue(tags, forKey: .tagNamesKey)
			}
			print("Tags set successfully.")
		`;

		const payload = JSON.stringify({ paths: resolvedPaths, tags });
		const result = await runSwiftCode(swiftCode, [payload]);
		return result.trim();
	}, 'Failed to set Finder tags')
};

export const quickLookTool = {
	definition: {
		name: 'quick_look',
		description: 'Open a Quick Look preview for a path (non-blocking).',
		parameters: {
			type: 'object',
			properties: {
				path: { type: 'string' }
			},
			required: ['path']
		}
	},
	execute: catchErrors(async ({ path: filePath }) => {
		const resolved = path.resolve(filePath);
		logger.info(`Quick Look on: ${resolved}`);
		// Run without waiting since qlmanage -p runs in the foreground until closed
		exec(`qlmanage -p "${resolved.replace(/"/g, '\\"')}"`);
		return `Quick Look preview opened for "${filePath}".`;
	}, 'Failed to open Quick Look')
};

export const moveToTrashTool = {
	definition: {
		name: 'move_to_trash',
		description: 'Move a file or directory to the Trash (recoverable).',
		parameters: {
			type: 'object',
			properties: {
				path: { type: 'string' }
			},
			required: ['path']
		}
	},
	execute: catchErrors(async ({ path: filePath }) => {
		const resolved = path.resolve(filePath);
		logger.info(`Moving to Trash: ${resolved}`);
		try {
			const appleScriptPath = resolved.replace(/"/g, '\\"');
			const script = `tell application "Finder" to move POSIX file "${appleScriptPath}" to trash`;
			await runAppleScript(script);
			return `Moved "${filePath}" to Trash successfully.`;
		} catch (err) {
			if (err.message.includes('-8013') || err.message.toLowerCase().includes('needs to be downloaded')) {
				logger.info(`Finder failed to trash iCloud file: ${resolved}. Revealing in Finder.`);
				const { exec } = await import('child_process');
				const { promisify } = await import('util');
				const execAsync = promisify(exec);
				await execAsync(`open -R "${resolved.replace(/"/g, '\\"')}"`);
				throw new Error(`The item "${filePath}" is an iCloud placeholder and cannot be moved to Trash programmatically. I have opened Finder and highlighted the item for you so you can delete it manually.`);
			}
			throw err;
		}
	}, 'Failed to move to trash')
};

export const spotlightSearchTool = {
	definition: {
		name: 'spotlight_search',
		description: 'Run a Spotlight (NSMetadataQuery) search using mdfind and return matching paths.',
		parameters: {
			type: 'object',
			properties: {
				query: { type: 'string', description: 'The query string (e.g. "kMDItemDisplayName == *test*").' }
			},
			required: ['query']
		}
	},
	execute: catchErrors(async ({ query }) => {
		logger.info(`Spotlight search for: ${query}`);
		const { stdout } = await execAsync(`mdfind "${query.replace(/"/g, '\\"')}"`);
		const paths = stdout.trim().split('\n').filter(Boolean);
		return JSON.stringify(paths.slice(0, 100), null, 2); // limit to top 100 matches
	}, 'Failed to run Spotlight search')
};
