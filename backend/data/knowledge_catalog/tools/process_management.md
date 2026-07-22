---
type: tool_group
title: Process Execution & Lifecycle Management
description: A comprehensive suite of tools for running, monitoring, and controlling system processes with support for both synchronous execution and asynchronous session management.
tags: [process, process_management, execution, run, start, terminate, kill, signal, stdout, stderr, stdin, async, synchronous, pid, session, process_run, process_start, process_read_output, process_write_input, process_terminate, process_list, process_kill, shell, subprocess, lifecycle]
tools: [process_run, process_start, process_read_output, process_write_input, process_terminate, process_list, process_kill]
timestamp: 2026-07-21T09:39:29.438Z
---

# Process Execution & Lifecycle Management

The **Process Management** toolset provides full control over system process execution and lifecycle. These tools enable running allow-listed commands with safety constraints, managing long-running asynchronous sessions, and monitoring or terminating system processes.

**Available Tools:**

- **`process_run`**: Run an allow-listed process synchronously with capped output and timeout protection.
- **`process_start`**: Start an allow-listed process asynchronously, returning a session ID for ongoing interaction.
- **`process_read_output`**: Read available stdout and stderr from an active async process session (non-blocking).
- **`process_write_input`**: Write string data to an active process session's standard input.
- **`process_terminate`**: Terminate an async process session gracefully (SIGTERM, escalating to SIGKILL if needed).
- **`process_list`**: List all running processes on the system with details (pid, ppid, uid, command).
- **`process_kill`**: Send a termination signal to a specific process PID with built-in safety guards.
