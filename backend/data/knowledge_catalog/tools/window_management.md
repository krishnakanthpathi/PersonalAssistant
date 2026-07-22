---
type: tool_group
title: macOS Window & Application Management
description: A comprehensive suite of tools for inspecting, focusing, moving, resizing, and managing application windows and Mission Control spaces on macOS.
tags: [window_management, macos, window, application, focus, move, resize, spaces, mission_control, accessibility, gui, get_active_window, list_apps, list_windows, focus_app, focus_window, move_window, resize_window, set_space]
tools: [get_active_window, list_apps, list_windows, focus_app, focus_window, move_window, resize_window, set_space]
timestamp: 2026-07-21T09:39:08.556Z
---

# macOS Window & Application Management

This toolkit provides granular control over the macOS graphical user interface, enabling automation of desktop organization and workflow management. It leverages Accessibility APIs to manipulate windows and allows interaction with Mission Control spaces.

**Available Tools:**

- **`get_active_window`**: Retrieves the application name of the frontmost focused window.
- **`list_apps`**: Lists all running GUI applications with details like bundle ID, name, PID, and frontmost status.
- **`list_windows`**: Enumerates on-screen windows, providing title, owner, PID, bounds, and layer info.
- **`focus_app`**: Activates and brings a specific application to the foreground by bundle ID or name.
- **`focus_window`**: Raises and focuses a specific window using its unique window number ID.
- **`move_window`**: Repositions a window to specified screen coordinates.
- **`resize_window`**: Resizes a window to specified width and height dimensions.
- **`set_space`**: Switches the active Mission Control space by index (1-9).
