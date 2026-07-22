---
type: tool_group
title: macOS Input Simulation & Automation
description: A comprehensive suite of tools for programmatically simulating mouse movements, keyboard input, and executing system-level automation scripts on macOS.
tags: [input, simulation, mouse, keyboard, typing, click, drag, scroll, key_press, type_text, keystroke_action, mouse_move, mouse_click, mouse_drag, mouse_scroll, applescript, osascript, automation, gui, macos, shortcut]
tools: [mouse_move, mouse_click, mouse_drag, mouse_scroll, key_press, type_text, keystroke_action, run_applescript]
timestamp: 2026-07-21T09:39:17.482Z
---

# macOS Input Simulation & Automation

This tool group provides low-level input simulation capabilities, enabling agents and scripts to interact with the macOS graphical user interface programmatically. These tools are essential for UI testing, workflow automation, and interacting with applications that lack scripting APIs.

**Available Tools:**

- **`mouse_move`**: Move the mouse cursor to specified global screen coordinates (x, y).
- **`mouse_click`**: Perform a mouse click at specific coordinates with configurable button, click count, and modifier keys.
- **`mouse_drag`**: Execute a press-drag-release mouse operation from one coordinate to another.
- **`mouse_scroll`**: Send scroll-wheel events in either line or pixel units.
- **`key_press`**: Press a single key or keyboard shortcut combination (named key + modifiers) on macOS.
- **`type_text`**: Type a Unicode string directly into the currently active input field.
- **`keystroke_action`**: Simulates typing text or pressing specific keyboard shortcut keys on macOS.
- **`run_applescript`**: Executes raw AppleScript code via `osascript` for advanced, custom automation workflows.
