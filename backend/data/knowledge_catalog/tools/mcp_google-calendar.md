---
type: tool_group
title: MCP Server - google-calendar
description: Integrated MCP server providing tools for google-calendar.
tags: [google-calendar, google, calendar, list, calendars, events, search, get, event, colors, create, update, delete, freebusy, current, time, respond, manage, accounts]
tools: [list-calendars, list-events, search-events, get-event, list-colors, create-event, create-events, update-event, delete-event, get-freebusy, get-current-time, respond-to-event, manage-accounts]
timestamp: 2026-07-22T16:48:50.709Z
---

# MCP Server - google-calendar

Integrated MCP server providing tools and capabilities for google-calendar.

### Available Tools

- **`list-calendars`**: List all available calendars
- **`list-events`**: List events from one or more calendars. Supports both calendar IDs and calendar names.
- **`search-events`**: Search for events in a calendar by text query.
- **`get-event`**: Get details of a specific event by ID.
- **`list-colors`**: List available color IDs and their meanings for calendar events
- **`create-event`**: Create a new calendar event.
- **`create-events`**: Create multiple calendar events in bulk. Accepts shared defaults (account, calendarId, timeZone) that apply to all events, with per-event overrides. Skips conflict and duplicate detection for speed.
- **`update-event`**: Update an existing calendar event with recurring event modification scope support.
- **`delete-event`**: Delete a calendar event.
- **`get-freebusy`**: Query free/busy information for calendars. Note: Time range is limited to a maximum of 3 months between timeMin and timeMax.
- **`get-current-time`**: Get the current date and time. Call this FIRST before creating, updating, or searching for events to ensure you have accurate date context for scheduling.
- **`respond-to-event`**: Respond to a calendar event invitation with Accept, Decline, Maybe (Tentative), or No Response.
- **`manage-accounts`**: Manage Google account authentication. Actions: 'list' (show accounts), 'add' (authenticate new account), 'remove' (remove account).
