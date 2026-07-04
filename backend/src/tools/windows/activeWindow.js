/**
 * Frontmost application tracker via win32 APIs or PowerShell helper
 */
import { runPowerShell } from './powerShell.js';

export async function getActiveWindow() {
	const command = '(Get-Process | Where-Object {$_.MainWindowTitle -ne ""}) | Select-Object -ExpandProperty MainWindowTitle';
	return runPowerShell(command);
}
