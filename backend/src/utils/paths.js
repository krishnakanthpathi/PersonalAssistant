/**
 * Computes cross-platform local application storage data paths
 */
import path from 'path';
import os from 'os';

export function getAppDataPath() {
	const platform = os.platform();
	const appName = 'PersonalAssistant';
	
	if (platform === 'win32') {
		return path.join(process.env.APPDATA || os.homedir(), appName);
	} else if (platform === 'darwin') {
		return path.join(os.homedir(), 'Library', 'Application Support', appName);
	} else {
		return path.join(os.homedir(), '.config', appName);
	}
}
