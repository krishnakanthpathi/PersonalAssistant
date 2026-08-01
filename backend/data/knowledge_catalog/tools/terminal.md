---
type: tool_group
title: Shell Command Execution & Terminal Session Management
description: Provides secure shell command execution within an allowlisted environment and full control over terminal application sessions.
tags: [terminal, shell, command, execute, bash, cwd, directory, iterm, iterm2, terminal.app, session, cli]
tools: [execute_command, change_directory, get_current_directory, get_allowed_commands, terminal]
timestamp: 2026-08-01T09:34:43.589Z
---

# Shell Command Execution & Terminal Session Management

These tools provide a secure interface for executing shell commands and managing terminal sessions on the host system. They bridge the gap between sandboxed execution and full terminal control.

**Available Tools:**

- **`execute_command`**: Execute an allowlisted shell command in the current working directory. Only pre-approved commands can be run for security.
- **`change_directory`**: Change the current working directory of the terminal session, affecting subsequent command executions.
- **`get_current_directory`**: Retrieve the current working directory of this terminal session.
- **`get_allowed_commands`**: Retrieve the list of allowed commands configured for this server, useful for discovering what operations are permitted.
- **`terminal`**: Interact with terminal applications (Terminal.app or iTerm2) to open windows, run commands, and list active sessions.
