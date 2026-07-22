---
type: tool_group
title: Terminal Session & Shell Command Execution
description: Provides capabilities to execute shell commands, manage the working directory, and interact with terminal applications.
tags: [terminal, shell, command, execute, cli, directory, pwd, cd, iterm, iterm2, terminal.app, session, shell_exec, allowed_commands, change_directory, get_current_directory]
tools: [execute_command, change_directory, get_current_directory, get_allowed_commands, terminal]
timestamp: 2026-07-21T09:39:03.560Z
---

# Terminal Session & Shell Command Execution

This tool group enables direct interaction with the system shell and terminal environment. It provides full control over command execution, directory navigation, and terminal application management.

### Available Tools

- **`terminal`**: Interact with terminal applications (Terminal.app or iTerm2): open windows, run commands, list active sessions.
- **`execute_command`**: Execute an allowlisted shell command in the current working directory.
- **`change_directory`**: Change the current working directory of the terminal session.
- **`get_current_directory`**: Retrieve the current working directory of this terminal session.
- **`get_allowed_commands`**: Retrieve the list of allowed commands configured for this server.
