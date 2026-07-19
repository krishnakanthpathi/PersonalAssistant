---
type: tool_group
title: macOS Window & Application Management
description: A comprehensive suite of tools for inspecting, focusing, moving, resizing windows and managing application spaces on macOS.
tags: [window_management, macos, window, application, focus, move, resize, space, mission_control, accessibility, gui, frontmost, active_window, list_apps, list_windows, get_active_window, focus_app, focus_window, move_window, resize_window, set_space, bundle_id, pid, bounds, layer]
tools: [get_active_window, list_apps, list_windows, focus_app, focus_window, move_window, resize_window, set_space]
timestamp: 2026-07-19T14:36:42.437Z
---

# macOS Window & Application Management

This toolkit provides granular control over the macOS graphical user interface, enabling automation of window and application workflows. It bridges the gap between system introspection and UI manipulation via the Accessibility API.

**Available Tools:**

- **`get_active_window`**: Retrieves the application name of the currently focused frontmost window.
- **`list_apps`**: Enumerates all running GUI applications with details like bundle ID, name, PID, and frontmost status.
- **`list_windows`**: Lists all on-screen windows, providing title, owner, PID, bounds, and layer information.
- **`focus_app`**: Activates and brings a specific application to the foreground using its bundle ID or name.
- **`focus_window`**: Raises and focuses a specific window using its unique window number ID.
- **`move_window`**: Repositions a window to specified screen coordinates (x, y).
- **`resize_window`**: Resizes a window to specified dimensions (width, height).
- **`set_space`**: Switches the active Mission Control space to a different desktop by index.
