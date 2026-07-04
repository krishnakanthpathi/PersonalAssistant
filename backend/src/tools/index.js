/**
 * Cross-platform router (reads process.platform)
 */
import { platform } from 'os';
import * as macTools from './mac/index.js';
import * as winTools from './windows/index.js';

export const nativeTools = platform() === 'darwin' ? macTools : winTools;
