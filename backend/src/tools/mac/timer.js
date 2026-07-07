import { exec } from 'child_process';
import { promisify } from 'util';
import { catchErrors } from '../../utils/errors.js';
import { logger } from '../../utils/logger.js';

const execAsync = promisify(exec);

// In-memory active timers registry
// Key: timer ID (string)
// Value: { id, label, durationMs, expiresAt, timeoutRef, startAt }
const activeTimers = new Map();

/**
 * Parses duration strings like "5m", "10s", "1h", "2m 30s" or raw numbers of seconds into milliseconds.
 */
function parseDuration(duration) {
	if (typeof duration === 'number') {
		return duration * 1000;
	}
	if (typeof duration !== 'string') {
		throw new Error('Duration must be a string or number');
	}

	const regex = /(\d+)\s*(h|m|s|hours?|minutes?|seconds?)/gi;
	let match;
	let totalMs = 0;
	let matched = false;

	while ((match = regex.exec(duration)) !== null) {
		matched = true;
		const value = parseInt(match[1], 10);
		const unit = match[2].toLowerCase();

		if (unit.startsWith('h')) {
			totalMs += value * 60 * 60 * 1000;
		} else if (unit.startsWith('m')) {
			totalMs += value * 60 * 1000;
		} else if (unit.startsWith('s')) {
			totalMs += value * 1000;
		}
	}

	if (!matched) {
		const raw = parseInt(duration, 10);
		if (isNaN(raw)) {
			throw new Error(`Invalid duration format: "${duration}". Use formats like "5m", "10s", "1h", or raw seconds.`);
		}
		return raw * 1000;
	}

	return totalMs;
}

/**
 * Formats milliseconds into a human-readable duration string.
 */
function formatDuration(ms) {
	if (ms <= 0) return '0s';
	const totalSecs = Math.floor(ms / 1000);
	const hours = Math.floor(totalSecs / 3600);
	const minutes = Math.floor((totalSecs % 3600) / 60);
	const seconds = totalSecs % 60;

	const parts = [];
	if (hours > 0) parts.push(`${hours}h`);
	if (minutes > 0) parts.push(`${minutes}m`);
	if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);
	return parts.join(' ');
}

/**
 * Executes an AppleScript command safely.
 */
function runAppleScript(script) {
	// Escape single quotes for bash
	const escapedScript = script.replace(/'/g, "'\\''");
	return execAsync(`osascript -e '${escapedScript}'`);
}

export const timerTool = {
	definition: {
		name: 'mac_timer',
		description: 'Manages timers on macOS (start, list, cancel). Triggers audio, notification, and modal alerts on completion.',
		parameters: {
			type: 'object',
			properties: {
				action: {
					type: 'string',
					enum: ['start', 'list', 'cancel'],
					description: 'The action to perform: "start" to set a new timer, "list" to view active timers, or "cancel" to stop an active timer.'
				},
				duration: {
					type: 'string',
					description: 'The duration for the timer (e.g., "5m", "10s", "1h", "2m 30s", or raw number of seconds). Required if action is "start".'
				},
				label: {
					type: 'string',
					description: 'A custom label or description for the timer (e.g., "Boil eggs", "Take a break").'
				},
				id: {
					type: 'string',
					description: 'The ID of the timer to cancel. Required if action is "cancel".'
				}
			}
		}
	},

	execute: catchErrors(async ({ action = 'start', duration, label, id }) => {
		logger.info(`mac_timer invoked with action: "${action}"`);

		if (action === 'start') {
			if (!duration) {
				throw new Error('Duration is required to start a timer.');
			}

			const durationMs = parseDuration(duration);
			if (durationMs <= 0) {
				throw new Error('Duration must be greater than 0.');
			}

			const timerLabel = label || 'Timer';
			const timerId = `timer_${Math.random().toString(36).substr(2, 9)}`;
			const startAt = Date.now();
			const expiresAt = startAt + durationMs;

			const timeoutRef = setTimeout(() => {
				logger.info(`Timer "${timerLabel}" (ID: ${timerId}) expired. Triggering alerts...`);
				
				const sanitizedLabel = timerLabel.replace(/["\\]/g, '\\$&');

				// 1. Play native sound (Glass sound)
				execAsync('afplay /System/Library/Sounds/Glass.aiff').catch(err => {
					logger.error(`Failed to play sound: ${err.message}`);
				});

				// 2. Speak the alert
				execAsync(`say "Timer finished: ${sanitizedLabel}"`).catch(err => {
					logger.error(`Failed to speak alert: ${err.message}`);
				});

				// 3. Native desktop notification
				runAppleScript(`display notification "${sanitizedLabel}" with title "Timer Finished" sound name "Glass"`).catch(err => {
					logger.error(`Failed to trigger notification: ${err.message}`);
				});

				// 4. GUI alert popup dialog (interactive modal)
				runAppleScript(`display dialog "Timer \\"${sanitizedLabel}\\" is finished!" buttons {"OK"} default button "OK" with title "Timer Alert"`).catch(err => {
					logger.error(`Failed to show alert dialog: ${err.message}`);
				});

				// Remove from active list
				activeTimers.delete(timerId);
			}, durationMs);

			activeTimers.set(timerId, {
				id: timerId,
				label: timerLabel,
				durationMs,
				startAt,
				expiresAt,
				timeoutRef
			});

			const formattedDuration = formatDuration(durationMs);
			const localTimeStr = new Date(expiresAt).toLocaleTimeString();

			return JSON.stringify({
				status: 'started',
				id: timerId,
				label: timerLabel,
				duration: formattedDuration,
				expiresAt: localTimeStr,
				message: `Timer "${timerLabel}" started. It will go off in ${formattedDuration} (at ${localTimeStr}).`
			}, null, 2);
		}

		if (action === 'list') {
			const list = Array.from(activeTimers.values()).map(t => {
				const timeLeftMs = Math.max(0, t.expiresAt - Date.now());
				return {
					id: t.id,
					label: t.label,
					duration: formatDuration(t.durationMs),
					timeLeft: formatDuration(timeLeftMs),
					expiresAt: new Date(t.expiresAt).toLocaleTimeString()
				};
			});

			return JSON.stringify({
				status: 'success',
				activeTimersCount: list.length,
				timers: list
			}, null, 2);
		}

		if (action === 'cancel') {
			if (!id) {
				throw new Error('Timer ID is required to cancel a timer.');
			}

			const t = activeTimers.get(id);
			if (!t) {
				throw new Error(`No active timer found with ID: ${id}`);
			}

			clearTimeout(t.timeoutRef);
			activeTimers.delete(id);

			return JSON.stringify({
				status: 'cancelled',
				id: t.id,
				label: t.label,
				message: `Timer "${t.label}" (ID: ${t.id}) successfully cancelled.`
			}, null, 2);
		}

		throw new Error(`Unsupported action: "${action}"`);
	}, 'Failed to execute timer operation')
};
