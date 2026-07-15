import { runAppleScript } from '../../utils/appleScript.js';
import { catchErrors } from '../../utils/errors.js';
import { logger } from '../../utils/logger.js';

/**
 * Parses duration strings like "5m", "10s", "1h" or raw numbers into milliseconds.
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
			throw new Error(`Invalid duration format: "${duration}". Use formats like "5m", "10s", "1h".`);
		}
		return raw * 1000;
	}

	return totalMs;
}

function parseTime(timeStr) {
	if (!timeStr) return null;
	const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm)?$/i);
	if (!match) return null;
	let hours = parseInt(match[1], 10);
	const minutes = parseInt(match[2], 10);
	const seconds = match[3] ? parseInt(match[3], 10) : 0;
	const ampm = match[4] ? match[4].toLowerCase() : null;

	if (ampm === 'pm' && hours < 12) hours += 12;
	if (ampm === 'am' && hours === 12) hours = 0;

	return { hours, minutes, seconds };
}

export const timerTool = {
	definition: {
		name: 'mac_timer',
		description: 'Manages timers inside the native macOS Clock App (start, list, cancel). Runs natively on the system rather than in-memory script threads.',
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
					description: 'The duration for the timer (e.g., "5m", "10s", "1h"). Required if action is "start" and date/time are not specified.'
				},
				label: {
					type: 'string',
					description: 'A custom label/title for the timer. Highly recommended for identifying timers.'
				},
				id: {
					type: 'string',
					description: 'The label/title of the timer to cancel. Required if action is "cancel" and label is not specified.'
				},
				date: {
					type: 'string',
					description: 'Optional target date (e.g., "2026-07-15", "tomorrow"). Defaults to today.'
				},
				time: {
					type: 'string',
					description: 'Optional target time (e.g., "18:00", "6:00 PM", "18:00:00"). Used if action is "start".'
				}
			},
			required: ['action']
		}
	},

	execute: catchErrors(async ({ action, duration, label, id, date, time }) => {
		logger.info(`mac_timer invoked with action: "${action}"`);

		if (action === 'start') {
			let durationMs = 0;

			if (duration) {
				durationMs = parseDuration(duration);
			} else if (time) {
				let targetDate = new Date();
				if (date) {
					if (date.trim().toLowerCase() === 'tomorrow') {
						targetDate.setDate(targetDate.getDate() + 1);
					} else {
						const parsedDate = new Date(date);
						if (isNaN(parsedDate.getTime())) {
							throw new Error(`Invalid date format: "${date}".`);
						}
						targetDate = parsedDate;
					}
				}

				const timeInfo = parseTime(time);
				if (!timeInfo) {
					throw new Error(`Invalid time format: "${time}". Use HH:MM, HH:MM:SS, or 12-hour format with AM/PM (e.g. "6:00 PM").`);
				}

				targetDate.setHours(timeInfo.hours, timeInfo.minutes, timeInfo.seconds, 0);
				const now = new Date();
				durationMs = targetDate.getTime() - now.getTime();
				
				if (durationMs <= 0) {
					throw new Error(`Target date and time (${targetDate.toLocaleString()}) must be in the future. Current time: ${now.toLocaleString()}`);
				}
			} else if (date) {
				const parsedDate = new Date(date);
				if (isNaN(parsedDate.getTime())) {
					throw new Error(`Invalid date format: "${date}".`);
				}
				const now = new Date();
				durationMs = parsedDate.getTime() - now.getTime();
				if (durationMs <= 0) {
					throw new Error(`Target date (${parsedDate.toLocaleString()}) must be in the future.`);
				}
			} else {
				throw new Error('You must specify either a duration (e.g. "5m") OR a time (e.g. "6:00 PM") to start a timer.');
			}

			const totalSeconds = Math.round(durationMs / 1000);
			if (totalSeconds <= 0) {
				throw new Error('Calculated duration must be greater than 0.');
			}

			const hours = Math.floor(totalSeconds / 3600);
			const minutes = Math.floor((totalSeconds % 3600) / 60);
			const seconds = totalSeconds % 60;
			const timerLabel = label || 'Timer';

			logger.info(`Starting native Clock app timer for ${hours}h ${minutes}m ${seconds}s with label "${timerLabel}"`);

			const script = `on findContainer(p)
	tell application "System Events" to tell process "Clock"
		if (count of sliders of p) > 0 then
			return p
		end if
		set gps to every group of p
		repeat with gp in gps
			set res to my findContainer(gp)
			if res is not missing value then
				return res
			end if
		end repeat
		return missing value
	end tell
end findContainer

on findControls(p)
	tell application "System Events" to tell process "Clock"
		if (count of text fields of p) > 0 then
			return p
		end if
		set gps to every group of p
		repeat with gp in gps
			set res to my findControls(gp)
			if res is not missing value then
				return res
			end if
		end repeat
		return missing value
	end tell
end findControls

on adjustSlider(sld, targetVal)
	tell application "System Events" to tell process "Clock"
		set currentValStr to value of sld
		set AppleScript's text item delimiters to " "
		set currentVal to (first text item of currentValStr) as integer
		
		click sld
		delay 0.1
		if currentVal < targetVal then
			repeat (targetVal - currentVal) times
				key code 126
				delay 0.05
			end repeat
		else if currentVal > targetVal then
			repeat (currentVal - targetVal) times
				key code 125
				delay 0.05
			end repeat
		end if
	end tell
end adjustSlider

tell application "Clock" to activate
delay 0.5

tell application "System Events" to tell process "Clock"
	click menu item "Timers" of menu "View" of menu bar 1
	delay 0.2
	
	tell window "Clock"
		set dialGroup to my findContainer(it)
		set controlsGroup to my findControls(it)
		
		if dialGroup is missing value or controlsGroup is missing value then
			error "Could not find Clock timer UI elements."
		end if
		
		set sld1 to slider 1 of dialGroup
		set sld2 to slider 2 of dialGroup
		set sld3 to slider 3 of dialGroup
		
		my adjustSlider(sld1, ${hours})
		my adjustSlider(sld2, ${minutes})
		my adjustSlider(sld3, ${seconds})
		
		set tf to text field 1 of controlsGroup
		set value of tf to "${timerLabel.replace(/"/g, '\\"')}"
		
		click button 2 of controlsGroup
	end tell
end tell`;

			await runAppleScript(script);

			return JSON.stringify({
				status: 'started',
				label: timerLabel,
				duration: `${hours}h ${minutes}m ${seconds}s`,
				message: `Timer "${timerLabel}" started in macOS Clock app for ${hours}h ${minutes}m ${seconds}s.`
			}, null, 2);
		}

		if (action === 'list') {
			logger.info('Listing active timers in macOS Clock app...');
			const script = `on findTimerGroups(p, foundList)
	tell application "System Events" to tell process "Clock"
		set hasClose to false
		try
			if class of p is group and (exists (first button of p whose description is "Close")) then
				set hasClose to true
			end if
		end try
		if hasClose then
			copy p to end of foundList
		else
			try
				set children to every UI element of p
				repeat with child in children
					my findTimerGroups(child, foundList)
				end repeat
			end try
		end if
	end tell
end findTimerGroups

tell application "Clock" to activate
delay 0.5
tell application "System Events" to tell process "Clock"
	click menu item "Timers" of menu "View" of menu bar 1
	delay 0.2
	tell window "Clock"
		set timerGroups to {}
		my findTimerGroups(it, a reference to timerGroups)
	
	set out to ""
	repeat with gp in timerGroups
		try
			set staticTexts to every static text of gp
			set timeVal to description of item 1 of staticTexts
			set labelVal to description of item 2 of staticTexts
			if labelVal is missing value or labelVal is "" then
				set labelVal to "Timer"
			end if
			set out to out & "[TIMER]" & "[TIME]" & timeVal & "[/TIME]" & "[LABEL]" & labelVal & "[/LABEL]" & "[/TIMER]" & "\\n"
		end try
	end repeat
	return out
	end tell
end tell`;

			const result = await runAppleScript(script);
			const timers = [];
			const matches = [...result.matchAll(/\[TIMER\]([\s\S]*?)\[\/TIMER\]/g)];

			for (const match of matches) {
				const content = match[1];
				const timeLeft = (content.match(/\[TIME\]([\s\S]*?)\[\/TIME\]/) || [])[1] || '';
				const labelVal = (content.match(/\[LABEL\]([\s\S]*?)\[\/LABEL\]/) || [])[1] || '';

				if (!timeLeft.includes(':')) continue;

				timers.push({
					label: labelVal,
					timeLeft: timeLeft
				});
			}

			return JSON.stringify({
				status: 'success',
				activeTimersCount: timers.length,
				timers: timers
			}, null, 2);
		}

		if (action === 'cancel') {
			const targetLabel = label || id;
			if (!targetLabel) {
				throw new Error('Timer label or title is required to cancel it.');
			}

			logger.info(`Cancelling native Clock app timer with label/id: "${targetLabel}"`);

			const script = `on findTimerGroups(p, foundList)
	tell application "System Events" to tell process "Clock"
		set hasClose to false
		try
			if class of p is group and (exists (first button of p whose description is "Close")) then
				set hasClose to true
			end if
		end try
		if hasClose then
			copy p to end of foundList
		else
			try
				set children to every UI element of p
				repeat with child in children
					my findTimerGroups(child, foundList)
				end repeat
			end try
		end if
	end tell
end findTimerGroups

tell application "Clock" to activate
delay 0.5
tell application "System Events" to tell process "Clock"
	click menu item "Timers" of menu "View" of menu bar 1
	delay 0.2
	tell window "Clock"
		set timerGroups to {}
		my findTimerGroups(it, a reference to timerGroups)
	
	set found to false
	repeat with gp in timerGroups
		try
			set staticTexts to every static text of gp
			set labelVal to description of item 2 of staticTexts
			if labelVal is "${targetLabel.replace(/"/g, '\\"')}" then
				click (first button of gp whose description is "Close")
				set found to true
				exit repeat
			end if
		end try
	end repeat
	if found then
		return "success"
	else
		return "not_found"
	end if
	end tell
end tell`;

			const result = await runAppleScript(script);
			if (result === 'not_found') {
				throw new Error(`No active timer found with label: "${targetLabel}"`);
			}

			return JSON.stringify({
				status: 'cancelled',
				label: targetLabel,
				message: `Timer "${targetLabel}" successfully cancelled in macOS Clock app.`
			}, null, 2);
		}

		throw new Error(`Unsupported action: "${action}"`);
	}, 'Failed to execute timer operation')
};
