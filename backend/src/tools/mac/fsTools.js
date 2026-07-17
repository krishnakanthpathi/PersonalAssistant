import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { catchErrors } from '../../utils/errors.js';
import { logger } from '../../utils/logger.js';

const execAsync = promisify(exec);

const ALLOWED_ROOTS = ['/Users/krishnakanth'];

function validatePath(targetPath) {
	const resolved = path.resolve(targetPath);
	const allowed = ALLOWED_ROOTS.some(root => resolved === root || resolved.startsWith(root + path.sep));
	if (!allowed) {
		throw new Error(`Access denied to path: ${targetPath}. Only paths under /Users/krishnakanth are allowed.`);
	}
	return resolved;
}

// Convert simple glob pattern to RegExp
function globToRegex(globPattern) {
	const escaped = globPattern.replace(/[.+^${}()|[\]\\]/g, '\\$&');
	const regexStr = '^' + escaped.replace(/\*/g, '.*').replace(/\?/g, '.') + '$';
	return new RegExp(regexStr, 'i');
}

export const fsReadTool = {
	definition: {
		name: 'fs_read',
		description: 'Read a file (UTF-8 text or base64). Cap 10 MB. Access restricted to /Users/krishnakanth.',
		parameters: {
			type: 'object',
			properties: {
				path: { type: 'string', description: 'Absolute or relative path to the file.' },
				encoding: { type: 'string', enum: ['utf8', 'base64'], default: 'utf8', description: 'The file encoding.' }
			},
			required: ['path']
		}
	},
	execute: catchErrors(async ({ path: filePath, encoding = 'utf8' }) => {
		const resolved = validatePath(filePath);
		logger.info(`Reading file: ${resolved}`);

		const stats = await fs.promises.stat(resolved);
		if (stats.size > 10 * 1024 * 1024) {
			throw new Error('File exceeds the 10 MB size limit.');
		}

		const data = await fs.promises.readFile(resolved);
		return encoding === 'base64' ? data.toString('base64') : data.toString('utf8');
	}, 'Failed to read file')
};

export const fsReadManyTool = {
	definition: {
		name: 'fs_read_many',
		description: 'Batch read up to 50 files / 10 MB total.',
		parameters: {
			type: 'object',
			properties: {
				paths: {
					type: 'array',
					items: { type: 'string' },
					description: 'List of paths to read.'
				},
				encoding: { type: 'string', enum: ['utf8', 'base64'], default: 'utf8' }
			},
			required: ['paths']
		}
	},
	execute: catchErrors(async ({ paths, encoding = 'utf8' }) => {
		if (paths.length > 50) throw new Error('Maximum 50 files allowed in batch read');
		logger.info(`Batch reading ${paths.length} files...`);

		const results = [];
		let totalSize = 0;

		for (const fp of paths) {
			try {
				const resolved = validatePath(fp);
				const stats = await fs.promises.stat(resolved);
				totalSize += stats.size;

				if (totalSize > 10 * 1024 * 1024) {
					throw new Error('Total batch read size exceeds 10 MB limit.');
				}

				const data = await fs.promises.readFile(resolved);
				results.push({
					path: fp,
					content: encoding === 'base64' ? data.toString('base64') : data.toString('utf8')
				});
			} catch (err) {
				results.push({
					path: fp,
					error: err.message
				});
			}
		}

		return JSON.stringify(results, null, 2);
	}, 'Failed to batch read files')
};

export const fsWriteTool = {
	definition: {
		name: 'fs_write',
		description: 'Write a file (text or base64). Cap 50 MB.',
		parameters: {
			type: 'object',
			properties: {
				path: { type: 'string', description: 'Target file path.' },
				content: { type: 'string', description: 'Content to write.' },
				encoding: { type: 'string', enum: ['utf8', 'base64'], default: 'utf8' },
				mode: { type: 'string', enum: ['create', 'overwrite', 'append'], default: 'create' }
			},
			required: ['path', 'content']
		}
	},
	execute: catchErrors(async ({ path: filePath, content, encoding = 'utf8', mode = 'create' }) => {
		const resolved = validatePath(filePath);
		logger.info(`Writing file: ${resolved} (mode: ${mode})`);

		const data = encoding === 'base64' ? Buffer.from(content, 'base64') : Buffer.from(content, 'utf8');
		if (data.length > 50 * 1024 * 1024) {
			throw new Error('File content exceeds 50 MB size limit.');
		}

		const exists = fs.existsSync(resolved);
		if (mode === 'create' && exists) {
			throw new Error('File already exists and mode is "create".');
		}

		if (mode === 'append') {
			await fs.promises.appendFile(resolved, data);
		} else {
			await fs.promises.writeFile(resolved, data);
		}

		return `File written successfully to ${filePath}.`;
	}, 'Failed to write file')
};

export const fsEditTool = {
	definition: {
		name: 'fs_edit',
		description: 'Find/replace inside a file. Atomic write with optional match count check.',
		parameters: {
			type: 'object',
			properties: {
				path: { type: 'string', description: 'Path to target file.' },
				find: { type: 'string', description: 'Exact content/pattern to find.' },
				replace: { type: 'string', description: 'Replacement content.' },
				expectCount: { type: 'integer', description: 'Optional exact number of matches expected to be replaced.' }
			},
			required: ['path', 'find', 'replace']
		}
	},
	execute: catchErrors(async ({ path: filePath, find, replace, expectCount }) => {
		const resolved = validatePath(filePath);
		logger.info(`Editing file: ${resolved}`);

		let content = await fs.promises.readFile(resolved, 'utf8');
		const occurrences = content.split(find).length - 1;

		if (expectCount !== undefined && occurrences !== expectCount) {
			throw new Error(`Sanity guard failed: expected ${expectCount} occurrences of pattern, but found ${occurrences}.`);
		}

		if (occurrences === 0) {
			return 'Target pattern not found. No replacements made.';
		}

		const newContent = content.split(find).join(replace);
		
		// Atomic write
		const tempPath = `${resolved}.tmp-${Date.now()}`;
		await fs.promises.writeFile(tempPath, newContent, 'utf8');
		await fs.promises.rename(tempPath, resolved);

		return `Replaced ${occurrences} occurrences in ${filePath} successfully.`;
	}, 'Failed to edit file')
};

export const fsWritePdfTool = {
	definition: {
		name: 'fs_write_pdf',
		description: 'Render plain text to a PDF (letter / a4 / legal).',
		parameters: {
			type: 'object',
			properties: {
				path: { type: 'string', description: 'Target PDF path.' },
				text: { type: 'string', description: 'Plain text contents.' },
				paperSize: { type: 'string', enum: ['letter', 'a4', 'legal'], default: 'letter' }
			},
			required: ['path', 'text']
		}
	},
	execute: catchErrors(async ({ path: filePath, text, paperSize = 'letter' }) => {
		const resolvedPdf = validatePath(filePath);
		logger.info(`Generating PDF ${resolvedPdf} (${paperSize})...`);

		// We use cupsfilter by writing to a temporary file
		const tempTxt = path.join(path.dirname(resolvedPdf), `temp-${Date.now()}.txt`);
		await fs.promises.writeFile(tempTxt, text, 'utf8');

		try {
			await execAsync(`cupsfilter -i text/plain -o media=${paperSize} -o document-format=application/pdf "${tempTxt}" > "${resolvedPdf}"`);
		} finally {
			if (fs.existsSync(tempTxt)) {
				await fs.promises.unlink(tempTxt);
			}
		}

		return `PDF generated successfully at ${filePath}`;
	}, 'Failed to write PDF')
};

export const fsListTool = {
	definition: {
		name: 'fs_list',
		description: 'List directory entries (name, kind, size, mtime). Optional recursive + glob filter.',
		parameters: {
			type: 'object',
			properties: {
				path: { type: 'string', description: 'Directory path.' },
				recursive: { type: 'boolean', default: false },
				glob: { type: 'string', description: 'Glob pattern to filter filenames (e.g. "*.js").' }
			},
			required: ['path']
		}
	},
	execute: catchErrors(async ({ path: dirPath, recursive = false, glob }) => {
		const resolved = validatePath(dirPath);
		logger.info(`Listing directory: ${resolved} (recursive: ${recursive})`);

		const regex = glob ? globToRegex(glob) : null;
		const results = [];

		async function scan(dir) {
			const files = await fs.promises.readdir(dir, { withFileTypes: true });
			for (const file of files) {
				const fullPath = path.join(dir, file.name);
				if (!ALLOWED_ROOTS.some(root => fullPath.startsWith(root))) continue; // safety check

				let stat;
				try {
					stat = await fs.promises.stat(fullPath);
				} catch {
					continue; // skip unreadable files
				}

				const isDirectory = file.isDirectory();
				const item = {
					name: path.relative(resolved, fullPath),
					kind: isDirectory ? 'directory' : 'file',
					size: stat.size,
					mtime: stat.mtime
				};

				if (!glob || regex.test(file.name)) {
					results.push(item);
				}

				if (recursive && isDirectory) {
					await scan(fullPath);
				}
			}
		}

		await scan(resolved);
		return JSON.stringify(results, null, 2);
	}, 'Failed to list directory')
};

export const fsStatTool = {
	definition: {
		name: 'fs_stat',
		description: 'Get path metadata: size, times, permissions, uid/gid, symlink target, and xattr names.',
		parameters: {
			type: 'object',
			properties: {
				path: { type: 'string', description: 'Target path.' }
			},
			required: ['path']
		}
	},
	execute: catchErrors(async ({ path: filePath }) => {
		const resolved = validatePath(filePath);
		logger.info(`Fetching stat for: ${resolved}`);

		const stat = await fs.promises.lstat(resolved);
		let symlinkTarget = null;
		if (stat.isSymbolicLink()) {
			try {
				symlinkTarget = await fs.promises.readlink(resolved);
			} catch (e) {
				symlinkTarget = 'unreadable';
			}
		}

		// List extended attributes
		let xattrs = [];
		try {
			const { stdout } = await execAsync(`xattr "${resolved}"`);
			xattrs = stdout.trim().split('\n').filter(Boolean);
		} catch {
			// ignore xattr errors if not supported/none
		}

		const meta = {
			kind: stat.isDirectory() ? 'directory' : stat.isSymbolicLink() ? 'symlink' : 'file',
			size: stat.size,
			created: stat.birthtime,
			modified: stat.mtime,
			accessed: stat.atime,
			permissions: (stat.mode & 0o777).toString(8),
			uid: stat.uid,
			gid: stat.gid,
			symlinkTarget,
			xattrNames: xattrs
		};

		return JSON.stringify(meta, null, 2);
	}, 'Failed to stat path')
};

export const fsCopyTool = {
	definition: {
		name: 'fs_copy',
		description: 'Copy a file or directory (both source and destination must be under /Users/krishnakanth).',
		parameters: {
			type: 'object',
			properties: {
				src: { type: 'string', description: 'Source path.' },
				dst: { type: 'string', description: 'Destination path.' }
			},
			required: ['src', 'dst']
		}
	},
	execute: catchErrors(async ({ src, dst }) => {
		const resolvedSrc = validatePath(src);
		const resolvedDst = validatePath(dst);
		logger.info(`Copying ${resolvedSrc} to ${resolvedDst}`);

		await fs.promises.cp(resolvedSrc, resolvedDst, { recursive: true });
		return `Successfully copied ${src} to ${dst}`;
	}, 'Failed to copy path')
};

export const fsMoveTool = {
	definition: {
		name: 'fs_move',
		description: 'Move or rename a file or directory.',
		parameters: {
			type: 'object',
			properties: {
				src: { type: 'string', description: 'Source path.' },
				dst: { type: 'string', description: 'Destination path.' }
			},
			required: ['src', 'dst']
		}
	},
	execute: catchErrors(async ({ src, dst }) => {
		const resolvedSrc = validatePath(src);
		const resolvedDst = validatePath(dst);
		logger.info(`Moving ${resolvedSrc} to ${resolvedDst}`);

		await fs.promises.rename(resolvedSrc, resolvedDst);
		return `Successfully moved/renamed ${src} to ${dst}`;
	}, 'Failed to move path')
};

export const fsMakeDirTool = {
	definition: {
		name: 'fs_make_dir',
		description: 'Create a directory recursively.',
		parameters: {
			type: 'object',
			properties: {
				path: { type: 'string', description: 'Directory path to create.' },
				permsOctal: { type: 'string', default: '755', description: 'Permissions in octal string.' }
			},
			required: ['path']
		}
	},
	execute: catchErrors(async ({ path: dirPath, permsOctal = '755' }) => {
		const resolved = validatePath(dirPath);
		logger.info(`Creating directory ${resolved} (perms: ${permsOctal})`);

		const mode = parseInt(permsOctal, 8);
		await fs.promises.mkdir(resolved, { recursive: true, mode });
		return `Directory ${dirPath} created successfully.`;
	}, 'Failed to make directory')
};

export const fsDeleteTool = {
	definition: {
		name: 'fs_delete',
		description: 'Delete a path. Moves to Trash by default, or unlinks permanently.',
		parameters: {
			type: 'object',
			properties: {
				path: { type: 'string' },
				permanent: { type: 'boolean', default: false }
			},
			required: ['path']
		}
	},
	execute: catchErrors(async ({ path: filePath, permanent = false }) => {
		const resolved = validatePath(filePath);
		logger.info(`Deleting path ${resolved} (permanent: ${permanent})`);

		if (permanent) {
			await fs.promises.rm(resolved, { recursive: true, force: true });
			return `Permanently deleted ${filePath}`;
		} else {
			// Move to Trash using AppleScript Finder
			const appleScriptPath = resolved.replace(/"/g, '\\"');
			const script = `tell application "Finder" to move POSIX file "${appleScriptPath}" to trash`;
			await execAsync(`osascript -e '${script}'`);
			return `Moved ${filePath} to Trash successfully.`;
		}
	}, 'Failed to delete path')
};

export const fsWatchOnceTool = {
	definition: {
		name: 'fs_watch_once',
		description: 'Block until the next change inside a path (or timeout). Returns changed paths.',
		parameters: {
			type: 'object',
			properties: {
				path: { type: 'string', description: 'Path to watch.' },
				timeoutMs: { type: 'integer', default: 5000, description: 'Timeout in milliseconds.' }
			},
			required: ['path']
		}
	},
	execute: catchErrors(async ({ path: watchPath, timeoutMs = 5000 }) => {
		const resolved = validatePath(watchPath);
		logger.info(`Watching path ${resolved} once (timeout: ${timeoutMs}ms)`);

		return new Promise((resolve) => {
			let watcher;
			const timeout = setTimeout(() => {
				if (watcher) watcher.close();
				resolve('No changes detected within timeout.');
			}, timeoutMs);

			watcher = fs.watch(resolved, { recursive: true }, (eventType, filename) => {
				clearTimeout(timeout);
				watcher.close();
				resolve(JSON.stringify({ eventType, filename }));
			});
		});
	}, 'Failed to watch path')
};

export const fsXattrGetTool = {
	definition: {
		name: 'fs_xattr_get',
		description: 'Read a macOS extended attribute (or list all attribute names if name is "*").',
		parameters: {
			type: 'object',
			properties: {
				path: { type: 'string', description: 'Path to file.' },
				name: { type: 'string', description: 'Attribute name, or "*" to list all attribute names.' }
			},
			required: ['path', 'name']
		}
	},
	execute: catchErrors(async ({ path: filePath, name }) => {
		const resolved = validatePath(filePath);
		logger.info(`Getting extended attribute "${name}" for: ${resolved}`);

		if (name === '*') {
			const { stdout } = await execAsync(`xattr "${resolved}"`);
			return stdout.trim() || 'No extended attributes found.';
		} else {
			const { stdout } = await execAsync(`xattr -p "${name.replace(/"/g, '\\"')}" "${resolved}"`);
			return stdout.trim() || 'Attribute value is empty.';
		}
	}, 'Failed to get extended attribute')
};

export const fsXattrSetTool = {
	definition: {
		name: 'fs_xattr_set',
		description: 'Write a macOS extended attribute (text or base64).',
		parameters: {
			type: 'object',
			properties: {
				path: { type: 'string' },
				name: { type: 'string' },
				value: { type: 'string' },
				encoding: { type: 'string', enum: ['text', 'base64'], default: 'text' }
			},
			required: ['path', 'name', 'value']
		}
	},
	execute: catchErrors(async ({ path: filePath, name, value, encoding = 'text' }) => {
		const resolved = validatePath(filePath);
		logger.info(`Setting extended attribute "${name}" for: ${resolved}`);

		const cleanValue = encoding === 'base64' ? Buffer.from(value, 'base64').toString('utf8') : value;
		await execAsync(`xattr -w "${name.replace(/"/g, '\\"')}" "${cleanValue.replace(/"/g, '\\"')}" "${resolved}"`);
		return `Extended attribute "${name}" written successfully to ${filePath}.`;
	}, 'Failed to set extended attribute')
};
