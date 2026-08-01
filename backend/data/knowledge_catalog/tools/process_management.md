---
type: tool_group
title: System Process Execution & Lifecycle Management
description: Provides capabilities to execute, monitor, and control both synchronous and asynchronous system processes with comprehensive lifecycle management.
tags: [process, process_management, execution, lifecycle, async, synchronous, signals, pid, stdin, stdout, stderr, subprocess, shell, kill, terminate, run, start, process_run, process_start, process_read_output, process_write_input, process_terminate, process_list, process_kill]
tools: [process_run, process_start, process_read_output, process_write_input, process_terminate, process_list, process_kill]
timestamp: 2026-08-01T09:34:58.621Z
---

# System Process Execution & Lifecycle Management

This toolset provides comprehensive control over system processes, enabling both fire-and-forget execution and interactive session management.

**Available Tools:**
- **`process_run`**: Run an allow-listed process synchronously (capped output + timeout).
- **`process_start`**: Start an allow-listed process asynchronously, returning a session ID.
- **`process_read_output`**: Read available stdout and stderr from an async process session (non-blocking).
- **`process_write_input`**: Write string to an active process session's standard input.
- **`process_terminate`**: Terminate an async process session (sends SIGTERM, then SIGKILL after 1s if needed).
- **`process_list`**: List running processes on the system (pid, ppid, uid, command). Read-only.
- **`process_kill`**: Send a signal to kill a process PID (refuses PID 1 or cross-user kills by default).
