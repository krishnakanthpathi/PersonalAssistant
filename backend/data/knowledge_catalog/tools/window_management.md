---
type: tool_group
title: macOS Window Management & Application Control
description: Tools for discovering, focusing, moving, resizing, and managing application windows and desktop spaces on macOS.
tags: [window_management, windows, apps, applications, focus, move, resize, spaces, mission_control, accessibility, gui, desktop, window_layer, bundle_id, pid, get_active_window, list_apps, list_windows, focus_app, focus_window, move_window, resize_window, set_space, frontmost, activate]
tools: [get_active_window, list_apps, list_windows, focus_app, focus_window, move_window, resize_window, set_space]
timestamp: 2026-08-01T09:34:48.383Z
---

# macOS Window Management & Application Control

This tool group provides comprehensive window and application management capabilities for macOS desktop automation. These tools leverage the Accessibility API to inspect, manipulate, and control on-screen windows and running applications.

**Available Tools:**

- **`get_active_window`**: Returns the application name of the currently focused frontmost window.
- **`list_apps`**: Enumerates all running GUI applications with bundle ID, name, PID, and frontmost status.
- **`list_windows`**: Lists all on-screen windows with titles, owner applications, PIDs, screen bounds, and layer information.
- **`focus_app`**: Activates and brings an application to the foreground by bundle ID or name.
- **`focus_window`**: Raises and focuses a specific window identified by its window number ID.
- **`move_window`**: Repositions a window to specified screen coordinates (x, y).
- **`resize_window`**: Resizes a window to specified dimensions (width, height).
- **`set_space`**: Switches to a Mission Control desktop space by index (1-9).
