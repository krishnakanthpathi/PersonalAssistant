import { runAppleScript } from '../../utils/appleScript.js';
import { catchErrors } from '../../utils/errors.js';
import { logger } from '../../utils/logger.js';

export const remindersTool = {
	definition: {
		name: 'mac_reminders',
		description: 'Manages macOS Reminders (create, list, complete, delete, list_lists). Interacts directly with the macOS Reminders app.',
		parameters: {
			type: 'object',
			properties: {
				action: {
					type: 'string',
					enum: ['create', 'list', 'complete', 'delete', 'list_lists'],
					description: 'The action to perform: "create" to add a new reminder, "list" to retrieve reminders, "complete" to mark a reminder as completed, "delete" to remove a reminder, or "list_lists" to view all reminders lists.'
				},
				title: {
					type: 'string',
					description: 'The title/name of the reminder. Required if action is "create".'
				},
				notes: {
					type: 'string',
					description: 'Optional notes or body text for the reminder. Used when action is "create".'
				},
				dueDate: {
					type: 'string',
					description: 'Optional due date (ISO string format like "2026-07-15T18:00:00" or similar). Used when action is "create".'
				},
				priority: {
					type: 'string',
					enum: ['none', 'low', 'medium', 'high'],
					description: 'Optional priority level of the reminder. Used when action is "create".'
				},
				recurrence: {
					type: 'string',
					enum: ['none', 'daily', 'weekly', 'monthly', 'yearly', 'weekdays', 'weekends'],
					description: 'Optional recurrence pattern for the reminder. Used when action is "create".'
				},
				listName: {
					type: 'string',
					description: 'The name of the target list. Optional for "create" (defaults to default list) and "list" (to filter by list).'
				},
				completed: {
					type: 'boolean',
					description: 'Filter reminders by completion status. Optional. Used when action is "list". If omitted, retrieves all reminders.'
				},
				id: {
					type: 'string',
					description: 'The unique reminder ID (e.g., "x-apple-reminder://..."). Required if action is "complete" or "delete".'
				},
				limit: {
					type: 'integer',
					description: 'Maximum number of reminders to return. Optional. Used when action is "list".'
				}
			},
			required: ['action']
		}
	},

	execute: catchErrors(async ({ action, title, notes, dueDate, priority, recurrence, listName, completed, id, limit }) => {
		logger.info(`mac_reminders invoked with action: "${action}"`);

		if (action === 'create') {
			if (!title) {
				throw new Error('Title is required to create a reminder.');
			}

			let finalDueDate = dueDate;
			if (recurrence && recurrence !== 'none' && !finalDueDate) {
				// Default to current date/time to serve as the start date/anchor for the recurrence rule
				finalDueDate = new Date().toISOString();
			}

			let script = 'tell application "Reminders"\n';
			if (listName) {
				const listNameEscaped = listName.replace(/"/g, '\\"');
				script += `	if not (exists list "${listNameEscaped}") then
		make new list with properties {name:"${listNameEscaped}"}
	end if
	set targetList to list "${listNameEscaped}"\n`;
			} else {
				script += `	set targetList to default list\n`;
			}

			const props = [];
			props.push(`name:"${title.replace(/"/g, '\\"')}"`);

			if (notes) {
				props.push(`body:"${notes.replace(/"/g, '\\"')}"`);
			}

			if (priority) {
				let pVal = 0;
				if (priority === 'high') pVal = 1;
				else if (priority === 'medium') pVal = 5;
				else if (priority === 'low') pVal = 9;
				props.push(`priority:${pVal}`);
			}

			if (finalDueDate) {
				const d = new Date(finalDueDate);
				if (isNaN(d.getTime())) {
					throw new Error(`Invalid dueDate format: "${finalDueDate}". Please provide a valid date format.`);
				}
				script += `	set myDate to current date
	set year of myDate to ${d.getFullYear()}
	set month of myDate to ${d.getMonth() + 1}
	set day of myDate to ${d.getDate()}
	set time of myDate to ${(d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds())}\n`;
				props.push(`due date:myDate`);
			}

			script += `	tell targetList
		set newRem to make new reminder with properties {${props.join(', ')}}
		return id of newRem
	end tell
end tell`;

			const reminderId = await runAppleScript(script);

			// Add recurrence rule using EventKit via AppleScriptObjC if specified
			if (recurrence && recurrence !== 'none') {
				let recurrenceScript = `use AppleScript version "2.4"
use scripting additions
use framework "Foundation"
use framework "EventKit"

property EKEventStore : a reference to current application's EKEventStore
property EKRecurrenceRule : a reference to current application's EKRecurrenceRule
property EKRecurrenceDayOfWeek : a reference to current application's EKRecurrenceDayOfWeek

set remId to "${reminderId.replace(/"/g, '\\"')}"
set theStore to EKEventStore's alloc()'s init()
set appleReminderPrefix to "x-apple-reminder://"
if remId starts with appleReminderPrefix then
	set theUUID to text ((length of appleReminderPrefix) + 1) thru -1 of remId
else
	set theUUID to remId
end if

set theItem to theStore's calendarItemWithIdentifier:theUUID
if theItem is not missing value then
`;

				if (recurrence === 'daily') {
					recurrenceScript += `	set recurrenceRule to EKRecurrenceRule's alloc()'s initRecurrenceWithFrequency:0 interval:1 |end|:(missing value)\n`;
				} else if (recurrence === 'weekly') {
					recurrenceScript += `	set recurrenceRule to EKRecurrenceRule's alloc()'s initRecurrenceWithFrequency:1 interval:1 |end|:(missing value)\n`;
				} else if (recurrence === 'monthly') {
					recurrenceScript += `	set recurrenceRule to EKRecurrenceRule's alloc()'s initRecurrenceWithFrequency:2 interval:1 |end|:(missing value)\n`;
				} else if (recurrence === 'yearly') {
					recurrenceScript += `	set recurrenceRule to EKRecurrenceRule's alloc()'s initRecurrenceWithFrequency:3 interval:1 |end|:(missing value)\n`;
				} else if (recurrence === 'weekdays') {
					recurrenceScript += `	set daysList to {}
	repeat with dayNum in {2, 3, 4, 5, 6}
		set end of daysList to (EKRecurrenceDayOfWeek's dayOfWeek:dayNum)
	end repeat
	set recurrenceRule to EKRecurrenceRule's alloc()'s initRecurrenceWithFrequency:1 interval:1 daysOfTheWeek:daysList daysOfTheMonth:(missing value) monthsOfTheYear:(missing value) weeksOfTheYear:(missing value) daysOfTheYear:(missing value) setPositions:(missing value) |end|:(missing value)\n`;
				} else if (recurrence === 'weekends') {
					recurrenceScript += `	set daysList to {}
	repeat with dayNum in {1, 7}
		set end of daysList to (EKRecurrenceDayOfWeek's dayOfWeek:dayNum)
	end repeat
	set recurrenceRule to EKRecurrenceRule's alloc()'s initRecurrenceWithFrequency:1 interval:1 daysOfTheWeek:daysList daysOfTheMonth:(missing value) monthsOfTheYear:(missing value) weeksOfTheYear:(missing value) daysOfTheYear:(missing value) setPositions:(missing value) |end|:(missing value)\n`;
				}

				recurrenceScript += `	theItem's addRecurrenceRule:recurrenceRule
	set success to theStore's saveReminder:theItem commit:true |error|:(missing value)
end if`;

				try {
					await runAppleScript(recurrenceScript);
				} catch (err) {
					logger.error(`Failed to add recurrence rule: ${err.message}`);
				}
			}

			return JSON.stringify({
				status: 'success',
				action: 'create',
				id: reminderId,
				title,
				recurrence,
				message: `Reminder "${title}" created successfully${recurrence && recurrence !== 'none' ? ` with recurrence: ${recurrence}` : ''}.`
			}, null, 2);
		}

		if (action === 'list') {
			let script = 'tell application "Reminders"\n';
			if (listName) {
				const listNameEscaped = listName.replace(/"/g, '\\"');
				script += `	if not (exists list "${listNameEscaped}") then
		return ""
	end if\n`;
				if (completed !== undefined) {
					script += `	set targetRef to a reference to (reminders of list "${listNameEscaped}" whose completed is ${completed})\n`;
				} else {
					script += `	set targetRef to a reference to (reminders of list "${listNameEscaped}")\n`;
				}
			} else {
				if (completed !== undefined) {
					script += `	set targetRef to a reference to (reminders whose completed is ${completed})\n`;
				} else {
					script += `	set targetRef to a reference to reminders\n`;
				}
			}

			script += `	set rNames to name of targetRef
	set rCompleteds to completed of targetRef
	set rIds to id of targetRef
	set rBodies to body of targetRef
	set rDueDates to due date of targetRef
	set rPriorities to priority of targetRef
	set rListNames to name of container of targetRef
	
	set out to ""
	set itemCount to count of rIds
	repeat with i from 1 to itemCount
		set rId to item i of rIds
		set rName to item i of rNames
		set rCompleted to item i of rCompleteds
		
		set rBody to item i of rBodies
		if rBody is missing value or rBody is "" then
			set rBody to ""
		end if
		
		set rDueDate to item i of rDueDates
		if rDueDate is missing value then
			set rDueDateStr to ""
		else
			set rDueDateStr to rDueDate as string
		end if
		
		set rPriority to item i of rPriorities
		set rListName to item i of rListNames
		
		set out to out & "[REMINDER]" & "[ID]" & rId & "[/ID]" & "[NAME]" & rName & "[/NAME]" & "[COMPLETED]" & (rCompleted as string) & "[/COMPLETED]" & "[BODY]" & rBody & "[/BODY]" & "[DUE]" & rDueDateStr & "[/DUE]" & "[PRIORITY]" & (rPriority as string) & "[/PRIORITY]" & "[LIST]" & rListName & "[/LIST]" & "[/REMINDER]" & "\\n"
	end repeat
	return out
end tell`;

			const result = await runAppleScript(script);
			const reminders = [];
			const matches = [...result.matchAll(/\[REMINDER\]([\s\S]*?)\[\/REMINDER\]/g)];

			for (const match of matches) {
				const content = match[1];

				const id = (content.match(/\[ID\]([\s\S]*?)\[\/ID\]/) || [])[1] || '';
				const name = (content.match(/\[NAME\]([\s\S]*?)\[\/NAME\]/) || [])[1] || '';
				const completedVal = ((content.match(/\[COMPLETED\]([\s\S]*?)\[\/COMPLETED\]/) || [])[1] || '').trim() === 'true';
				const body = (content.match(/\[BODY\]([\s\S]*?)\[\/BODY\]/) || [])[1] || '';
				const rawDue = (content.match(/\[DUE\]([\s\S]*?)\[\/DUE\]/) || [])[1] || '';
				const rawPriority = parseInt((content.match(/\[PRIORITY\]([\s\S]*?)\[\/PRIORITY\]/) || [])[1] || '0', 10);
				const list = (content.match(/\[LIST\]([\s\S]*?)\[\/LIST\]/) || [])[1] || '';

				let dueDate = null;
				if (rawDue && rawDue !== 'missing value') {
					const cleaned = rawDue.replace(/\s+at\s+/i, ' ').replace(/\u202f/g, ' ');
					const d = new Date(cleaned);
					if (!isNaN(d.getTime())) {
						dueDate = d.toISOString();
					} else {
						dueDate = rawDue;
					}
				}

				let priorityStr = 'none';
				if (rawPriority === 1) priorityStr = 'high';
				else if (rawPriority === 5) priorityStr = 'medium';
				else if (rawPriority === 9) priorityStr = 'low';

				reminders.push({
					id,
					name,
					completed: completedVal,
					body,
					dueDate,
					priority: priorityStr,
					list
				});
			}

			let finalReminders = reminders;
			if (limit !== undefined && limit > 0) {
				finalReminders = reminders.slice(0, limit);
			}

			return JSON.stringify(finalReminders, null, 2);
		}

		if (action === 'complete') {
			if (!id) {
				throw new Error('ID is required to complete a reminder.');
			}
			const script = `tell application "Reminders"
	set completed of reminder id "${id.replace(/"/g, '\\"')}" to true
	return "success"
end tell`;
			await runAppleScript(script);
			return JSON.stringify({
				status: 'success',
				action: 'complete',
				id,
				message: `Reminder with ID ${id} marked as completed.`
			}, null, 2);
		}

		if (action === 'delete') {
			if (!id) {
				throw new Error('ID is required to delete a reminder.');
			}
			const script = `tell application "Reminders"
	delete reminder id "${id.replace(/"/g, '\\"')}"
	return "success"
end tell`;
			await runAppleScript(script);
			return JSON.stringify({
				status: 'success',
				action: 'delete',
				id,
				message: `Reminder with ID ${id} deleted successfully.`
			}, null, 2);
		}

		if (action === 'list_lists') {
			const script = `tell application "Reminders"
	set out to ""
	repeat with l in lists
		set out to out & "[LIST]" & "[ID]" & id of l & "[/ID]" & "[NAME]" & name of l & "[/NAME]" & "[/LIST]" & "\\n"
	end repeat
	return out
end tell`;
			const result = await runAppleScript(script);
			const lists = [];
			const matches = [...result.matchAll(/\[LIST\]([\s\S]*?)\[\/LIST\]/g)];

			for (const match of matches) {
				const content = match[1];
				const id = (content.match(/\[ID\]([\s\S]*?)\[\/ID\]/) || [])[1] || '';
				const name = (content.match(/\[NAME\]([\s\S]*?)\[\/NAME\]/) || [])[1] || '';
				lists.push({ id, name });
			}

			return JSON.stringify(lists, null, 2);
		}

		throw new Error(`Unsupported action: "${action}"`);
	}, 'Failed to execute reminders operation')
};
