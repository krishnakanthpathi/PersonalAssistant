---
type: tool_group
title: Process Management & Execution Control
description: A comprehensive suite of tools for spawning, monitoring, and controlling system processes with both synchronous and asynchronous execution modes.
tags: [process, process_management, execution, run, start, terminate, kill, process_run, process_start, process_read_output, process_write_input, process_terminate, process_list, process_kill, async, subprocess, pid, signals, stdout, stdin, stderr, session]
tools: [process_run, process_start, process_read_output, process_write_input, process_terminate, process_list, process_kill]
timestamp: 2026-07-19T14:36:57.784Z
---

# Process Management & Execution Control

Process management tools enable controlled execution and lifecycle management of system processes. These tools support:

- **`process_run`** — Run allow-listed processes synchronously with capped output and timeout enforcement for safe, bounded execution.
- **`process_start`** — Launch allow-listed processes asynchronously, returning a session ID for ongoing interaction.
- **`process_read_output`** — Retrieve available stdout/stderr from an async session without blocking.
- **`process_write_input`** — Send string data to a running process's standard input stream.
- **`process_terminate`** — Gracefully end an async process session (SIGTERM → SIGKILL escalation after 1s).
- **`process_list`** — Query all running system processes, exposing PID, PPID, UID, and command details (read-only).
- **`process_kill`** — Send termination signals to specific PIDs with built-in safety checks (refuses PID 1 and cross-user kills).
