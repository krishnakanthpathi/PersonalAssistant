import { runAppleScript } from '../../utils/appleScript.js';
import { catchErrors } from '../../utils/errors.js';
import { logger } from '../../utils/logger.js';

export const mailTool = {
	definition: {
		name: 'mail',
		description: 'Interact with Mail.app: compose outgoing messages, search messages, or list unread inbox messages.',
		parameters: {
			type: 'object',
			properties: {
				action: { type: 'string', enum: ['compose', 'search', 'list-unread'], description: 'The mail action.' },
				to: { type: 'string', description: 'Recipient email address (for compose).' },
				subject: { type: 'string', description: 'Subject of the email (for compose).' },
				body: { type: 'string', description: 'Email body content (for compose).' },
				query: { type: 'string', description: 'Search query string (for search).' }
			},
			required: ['action']
		}
	},
	execute: catchErrors(async ({ action, to, subject, body, query }) => {
		logger.info(`Running Mail action: ${action}`);

		if (action === 'compose') {
			if (!to) throw new Error('Recipient "to" is required for compose');
			const script = `
				tell application "Mail"
					set newMsg to make new outgoing message with properties {subject:"${(subject || '').replace(/"/g, '\\"')}", content:"${(body || '').replace(/"/g, '\\"')}", visible:true}
					tell newMsg
						make new to recipient with properties {address:"${to.replace(/"/g, '\\"')}"}
					end tell
					activate
				end tell
			`;
			await runAppleScript(script);
			return `Draft email composed successfully in Mail.app.`;
		} else if (action === 'list-unread') {
			const script = `
				tell application "Mail"
					set outputText to ""
					try
						set unreadMsgs to every message of inbox whose read status is false
						repeat with msg in unreadMsgs
							set outputText to outputText & (sender of msg) & ";" & (subject of msg) & ";" & (date received of msg as string) & "\\n"
						end repeat
					end try
					return outputText
				end tell
			`;
			const result = await runAppleScript(script);
			if (!result || result.trim() === '') return 'No unread messages found.';
			const messages = result.trim().split('\n').map(line => {
				const [sender, sub, date] = line.split(';');
				return { sender, subject: sub, date };
			});
			return JSON.stringify(messages, null, 2);
		} else if (action === 'search') {
			if (!query) throw new Error('Search "query" is required');
			const script = `
				tell application "Mail"
					set outputText to ""
					try
						set msgs to every message of inbox whose (subject contains "${query.replace(/"/g, '\\"')}") or (content contains "${query.replace(/"/g, '\\"')}") or (sender contains "${query.replace(/"/g, '\\"')}")
						repeat with msg in msgs
							set outputText to outputText & (sender of msg) & ";" & (subject of msg) & ";" & (date received of msg as string) & "\\n"
						end repeat
					end try
					return outputText
				end tell
			`;
			const result = await runAppleScript(script);
			if (!result || result.trim() === '') return `No messages matching query "${query}" found.`;
			const messages = result.trim().split('\n').map(line => {
				const [sender, sub, date] = line.split(';');
				return { sender, subject: sub, date };
			});
			return JSON.stringify(messages, null, 2);
		}
	}, 'Failed to run Mail action')
};

export const calendarTool = {
	definition: {
		name: 'calendar',
		description: 'Manage Calendar.app events: create calendar events or list events scheduled for today.',
		parameters: {
			type: 'object',
			properties: {
				action: { type: 'string', enum: ['create-event', 'list-today'] },
				title: { type: 'string', description: 'Title of the event.' },
				startDate: { type: 'string', description: 'Start date/time (e.g. "July 17, 2026 14:00:00").' },
				endDate: { type: 'string', description: 'End date/time (e.g. "July 17, 2026 15:00:00").' }
			},
			required: ['action']
		}
	},
	execute: catchErrors(async ({ action, title, startDate, endDate }) => {
		logger.info(`Running Calendar action: ${action}`);

		if (action === 'create-event') {
			if (!title || !startDate || !endDate) {
				throw new Error('title, startDate, and endDate are required to create an event');
			}
			const script = `
				tell application "Calendar"
					tell calendar 1
						make new event with properties {summary:"${title.replace(/"/g, '\\"')}", start date:date "${startDate.replace(/"/g, '\\"')}", end date:date "${endDate.replace(/"/g, '\\"')}"}
					end tell
				end tell
			`;
			await runAppleScript(script);
			return `Event "${title}" created successfully in Calendar.app.`;
		} else if (action === 'list-today') {
			const script = `
				tell application "Calendar"
					set outputText to ""
					try
						set todayStart to (current date)
						set time of todayStart to 0
						set todayEnd to todayStart + 1 * days
						
						tell calendar 1
							set todayEvents to (every event whose start date is greater than or equal to todayStart and start date is less than todayEnd)
							repeat with ev in todayEvents
								set outputText to outputText & (summary of ev) & ";" & (start date of ev as string) & ";" & (end date of ev as string) & "\\n"
							end repeat
						end tell
					end try
					return outputText
				end tell
			`;
			const result = await runAppleScript(script);
			if (!result || result.trim() === '') return 'No events scheduled for today.';
			const events = result.trim().split('\n').map(line => {
				const [sum, start, end] = line.split(';');
				return { summary: sum, start, end };
			});
			return JSON.stringify(events, null, 2);
		}
	}, 'Failed to run Calendar action')
};

export const messagesTool = {
	definition: {
		name: 'messages',
		description: 'Interact with Messages.app: send text messages or list recent buddy conversations.',
		parameters: {
			type: 'object',
			properties: {
				action: { type: 'string', enum: ['send', 'list-recent'] },
				recipient: { type: 'string', description: 'Phone number or email of the recipient (required for send).' },
				message: { type: 'string', description: 'The text message to send (required for send).' }
			},
			required: ['action']
		}
	},
	execute: catchErrors(async ({ action, recipient, message }) => {
		logger.info(`Running Messages action: ${action}`);

		if (action === 'send') {
			if (!recipient || !message) throw new Error('recipient and message are required');
			const script = `
				tell application "Messages"
					set targetService to 1st service whose service type is iMessage
					set targetBuddy to buddy "${recipient.replace(/"/g, '\\"')}" of targetService
					send "${message.replace(/"/g, '\\"')}" to targetBuddy
				end tell
			`;
			await runAppleScript(script);
			return `Message sent successfully to ${recipient}.`;
		} else if (action === 'list-recent') {
			const script = `
				tell application "Messages"
					set outputText to ""
					try
						repeat with c in chats
							set outputText to outputText & (name of c) & ";" & (id of c) & "\\n"
						end repeat
					end try
					return outputText
				end tell
			`;
			const result = await runAppleScript(script);
			if (!result || result.trim() === '') return 'No recent chats found.';
			const chats = result.trim().split('\n').map(line => {
				const [name, id] = line.split(';');
				return { name, id };
			});
			return JSON.stringify(chats, null, 2);
		}
	}, 'Failed to run Messages action')
};

export const safariTool = {
	definition: {
		name: 'safari',
		description: 'Control Safari browser: open a URL, get open tab details, or execute custom JavaScript on the active tab.',
		parameters: {
			type: 'object',
			properties: {
				action: { type: 'string', enum: ['open-url', 'get-tabs', 'run-js-on-active-tab'] },
				url: { type: 'string', description: 'The URL to open.' },
				script: { type: 'string', description: 'JavaScript code to execute on the active page.' }
			},
			required: ['action']
		}
	},
	execute: catchErrors(async ({ action, url, script: jsScript }) => {
		logger.info(`Running Safari action: ${action}`);

		if (action === 'open-url') {
			if (!url) throw new Error('url is required');
			const script = `
				tell application "Safari"
					open location "${url.replace(/"/g, '\\"')}"
					activate
				end tell
			`;
			await runAppleScript(script);
			return `URL "${url}" opened in Safari.`;
		} else if (action === 'get-tabs') {
			const script = `
				tell application "Safari"
					set tabList to ""
					repeat with w in windows
						repeat with t in tabs of w
							set tabList to tabList & (name of t) & ";" & (URL of t) & "\\n"
						end repeat
					end repeat
					return tabList
				end tell
			`;
			const result = await runAppleScript(script);
			if (!result || result.trim() === '') return 'No tabs open in Safari.';
			const tabs = result.trim().split('\n').map(line => {
				const [name, tabUrl] = line.split(';');
				return { name, url: tabUrl };
			});
			return JSON.stringify(tabs, null, 2);
		} else if (action === 'run-js-on-active-tab') {
			if (!jsScript) throw new Error('script is required');
			const script = `
				tell application "Safari"
					do JavaScript "${jsScript.replace(/"/g, '\\"')}" in document 1
				end tell
			`;
			const result = await runAppleScript(script);
			return `Script executed. Result: ${result || 'no return value'}`;
		}
	}, 'Failed to run Safari action')
};

export const notesTool = {
	definition: {
		name: 'notes',
		description: 'Interact with Notes.app: create a new note, search for notes, or append text to an existing note.',
		parameters: {
			type: 'object',
			properties: {
				action: { type: 'string', enum: ['create', 'search', 'append'] },
				title: { type: 'string', description: 'Title of the note (used for create).' },
				body: { type: 'string', description: 'Note text body content.' },
				query: { type: 'string', description: 'Search query.' },
				noteId: { type: 'string', description: 'Note object ID or exact note name (used for append).' }
			},
			required: ['action']
		}
	},
	execute: catchErrors(async ({ action, title, body, query, noteId }) => {
		logger.info(`Running Notes action: ${action}`);

		if (action === 'create') {
			if (!title || !body) throw new Error('title and body are required for create action');
			const script = `
				tell application "Notes"
					tell folder "Notes"
						make new note with properties {name:"${title.replace(/"/g, '\\"')}", body:"${body.replace(/"/g, '\\"')}"}
					end tell
				end tell
			`;
			await runAppleScript(script);
			return `Note "${title}" created successfully.`;
		} else if (action === 'search') {
			if (!query) throw new Error('query is required for search action');
			const script = `
				tell application "Notes"
					set outputText to ""
					try
						set noteList to every note whose name contains "${query.replace(/"/g, '\\"')}" or body contains "${query.replace(/"/g, '\\"')}"
						repeat with n in noteList
							set outputText to outputText & (name of n) & ";" & (id of n) & "\\n"
						end repeat
					end try
					return outputText
				end tell
			`;
			const result = await runAppleScript(script);
			if (!result || result.trim() === '') return `No notes found matching "${query}".`;
			const notes = result.trim().split('\n').map(line => {
				const [name, id] = line.split(';');
				return { name, id };
			});
			return JSON.stringify(notes, null, 2);
		} else if (action === 'append') {
			if (!noteId || !body) throw new Error('noteId and body are required for append action');
			const script = `
				tell application "Notes"
					try
						set myNote to first note whose name is "${noteId.replace(/"/g, '\\"')}" or id is "${noteId.replace(/"/g, '\\"')}"
						set body of myNote to (body of myNote) & "<br>" & "${body.replace(/"/g, '\\"')}"
						return "success"
					on error err
						return err
					end try
				end tell
			`;
			const result = await runAppleScript(script);
			if (result.trim() === 'success') {
				return `Content appended to note successfully.`;
			} else {
				throw new Error(`AppleScript error: ${result}`);
			}
		}
	}, 'Failed to run Notes action')
};

export const terminalTool = {
	definition: {
		name: 'terminal',
		description: 'Interact with terminal applications (Terminal.app or iTerm2): open windows, run commands, list active sessions, or read console outputs.',
		parameters: {
			type: 'object',
			properties: {
				action: { type: 'string', enum: ['open_window', 'run_command', 'send_text', 'get_active_text', 'list_sessions'] },
				command: { type: 'string', description: 'Command to run (for run_command).' },
				text: { type: 'string', description: 'Text to send without trailing newline (for send_text).' },
				target: { type: 'string', enum: ['terminal', 'iterm2'], default: 'terminal', description: 'Target application.' }
			},
			required: ['action']
		}
	},
	execute: catchErrors(async ({ action, command, text, target = 'terminal' }) => {
		logger.info(`Running Terminal action: ${action} on target: ${target}`);

		if (target === 'iterm2') {
			if (action === 'open_window') {
				const script = `
					tell application "iTerm"
						create window with default profile
						activate
					end tell
				`;
				await runAppleScript(script);
				return 'New iTerm2 window opened.';
			} else if (action === 'run_command' || action === 'send_text') {
				const cmd = command || text;
				if (!cmd) throw new Error('command/text is required');
				const script = `
					tell application "iTerm"
						tell current session of current window
							write text "${cmd.replace(/"/g, '\\"')}"
						end tell
						activate
					end tell
				`;
				await runAppleScript(script);
				return 'Command/Text sent to active iTerm2 session.';
			} else if (action === 'get_active_text') {
				const script = `
					tell application "iTerm"
						tell current session of current window
							return text
						end tell
					end tell
				`;
				const result = await runAppleScript(script);
				return result;
			} else if (action === 'list_sessions') {
				const script = `
					tell application "iTerm"
						set outputText to ""
						repeat with w in windows
							repeat with t in tabs of w
								repeat with s in sessions of t
									set outputText to outputText & (id of s) & ";" & (name of s) & "\\n"
								end repeat
							end repeat
						end repeat
						return outputText
					end tell
				`;
				const result = await runAppleScript(script);
				if (!result || result.trim() === '') return '[]';
				const sessions = result.trim().split('\n').map(line => {
					const [id, name] = line.split(';');
					return { id, name };
				});
				return JSON.stringify(sessions, null, 2);
			}
		} else {
			// Terminal.app fallback
			if (action === 'open_window') {
				const script = `
					tell application "Terminal"
						do script ""
						activate
					end tell
				`;
				await runAppleScript(script);
				return 'New Terminal.app window opened.';
			} else if (action === 'run_command') {
				if (!command) throw new Error('command is required');
				const script = `
					tell application "Terminal"
						do script "${command.replace(/"/g, '\\"')}"
						activate
					end tell
				`;
				await runAppleScript(script);
				return 'Command sent to Terminal.app.';
			} else if (action === 'send_text') {
				if (!text) throw new Error('text is required');
				const script = `
					tell application "Terminal"
						tell front window
							do script "${text.replace(/"/g, '\\"')}" in selected tab
						end tell
						activate
					end tell
				`;
				await runAppleScript(script);
				return 'Text sent to Terminal.app.';
			} else if (action === 'get_active_text') {
				const script = `
					tell application "Terminal"
						contents of selected tab of front window
					end tell
				`;
				const result = await runAppleScript(script);
				return result;
			} else if (action === 'list_sessions') {
				const script = `
					tell application "Terminal"
						set outputText to ""
						repeat with w in windows
							repeat with t in tabs of w
								set outputText to outputText & (id of w as string) & ";" & (name of t) & "\\n"
							end repeat
						end repeat
						return outputText
					end tell
				`;
				const result = await runAppleScript(script);
				if (!result || result.trim() === '') return '[]';
				const sessions = result.trim().split('\n').map(line => {
					const [id, name] = line.split(';');
					return { windowId: id, tabName: name };
				});
				return JSON.stringify(sessions, null, 2);
			}
		}
	}, 'Failed to run Terminal action')
};
