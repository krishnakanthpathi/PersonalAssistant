"""
macOS Control & Workstation Automation FastMCP Server
Exposes all native macOS system, filesystem, UI, and application tools as MCP tools.
"""

from fastmcp import FastMCP
from typing import Optional, List

from tools.system import (
    set_volume as set_volume_impl,
    get_volume as get_volume_impl,
    toggle_dark_mode as toggle_dark_mode_impl,
    system_power as system_power_impl,
    lock_screen as lock_screen_impl,
    say_speech as say_speech_impl,
    get_system_stats as get_system_stats_impl,
    wifi_control as wifi_control_impl
)
from tools.app_window import (
    get_active_window as get_active_window_impl,
    list_applications as list_applications_impl,
    open_application as open_application_impl,
    close_application as close_application_impl,
    open_url as open_url_impl,
    list_apps as list_apps_impl,
    list_windows as list_windows_impl,
    focus_app as focus_app_impl,
    focus_window as focus_window_impl,
    move_window as move_window_impl,
    resize_window as resize_window_impl,
    set_space as set_space_impl
)
from tools.input import (
    keystroke_action as keystroke_action_impl,
    mouse_move as mouse_move_impl,
    mouse_click as mouse_click_impl,
    mouse_drag as mouse_drag_impl,
    mouse_scroll as mouse_scroll_impl,
    key_press as key_press_impl,
    type_text as type_text_impl,
    shortcut_list as shortcut_list_impl,
    shortcut_run as shortcut_run_impl,
    wait_ms as wait_ms_impl
)
from tools.filesystem import (
    fs_read as fs_read_impl,
    fs_read_many as fs_read_many_impl,
    fs_write as fs_write_impl,
    fs_edit as fs_edit_impl,
    fs_write_pdf as fs_write_pdf_impl,
    fs_list as fs_list_impl,
    fs_stat as fs_stat_impl,
    fs_copy as fs_copy_impl,
    fs_move as fs_move_impl,
    fs_mkdir as fs_mkdir_impl,
    fs_delete as fs_delete_impl,
    fs_watch_once as fs_watch_once_impl,
    fs_xattr_get as fs_xattr_get_impl,
    fs_xattr_set as fs_xattr_set_impl
)
from tools.finder import (
    reveal_in_finder as reveal_in_finder_impl,
    get_finder_selection as get_finder_selection_impl,
    set_finder_tags as set_finder_tags_impl,
    quick_look as quick_look_impl,
    move_to_trash as move_to_trash_impl,
    spotlight_search as spotlight_search_impl,
    empty_trash as empty_trash_impl
)
from tools.process import (
    process_run as process_run_impl,
    process_start as process_start_impl,
    process_read_output as process_read_output_impl,
    process_write_input as process_write_input_impl,
    process_terminate as process_terminate_impl,
    process_list as process_list_impl,
    process_kill as process_kill_impl
)
from tools.media import (
    media_control as media_control_impl
)
from tools.timer_reminders import (
    reminders_action as reminders_action_impl,
    timer_action as timer_action_impl
)
from tools.applescript import (
    execute_applescript as execute_applescript_impl
)
from tools.screenshot_ui import (
    take_screenshot as take_screenshot_impl,
    capture_screen as capture_screen_impl,
    get_accessibility_tree as get_accessibility_tree_impl,
    get_system_info as get_system_info_impl,
    get_screen_info as get_screen_info_impl,
    clipboard_action as clipboard_action_impl,
    clipboard_read as clipboard_read_impl,
    clipboard_write as clipboard_write_impl,
    notify as notify_impl,
    prompt_user as prompt_user_impl
)
from tools.app_integrations import (
    calendar_create as calendar_create_impl,
    contacts_search as contacts_search_impl,
    notes_create as notes_create_impl,
    mail_send_draft as mail_send_draft_impl,
    iphone_mirror_info as iphone_mirror_info_impl,
    analyze_image as analyze_image_impl,
    get_knowledge_document as get_knowledge_document_impl,
    update_knowledge_document as update_knowledge_document_impl
)

# Initialize FastMCP server instance
mcp = FastMCP("mac")

# ==================== SYSTEM CONTROLS ====================
@mcp.tool()
def set_volume(level: int) -> str:
    """Sets macOS system volume output level (0 to 100)."""
    return set_volume_impl(level)

@mcp.tool()
def get_volume() -> str:
    """Gets current macOS system volume output level and mute status."""
    return get_volume_impl()

@mcp.tool()
def toggle_dark_mode(state: Optional[str] = None) -> str:
    """Toggles or sets dark mode on macOS (state: 'on', 'off', or 'toggle')."""
    return toggle_dark_mode_impl(state)

@mcp.tool()
def system_power(action: str) -> str:
    """Triggers system power state action ('sleep', 'restart', 'shutdown', 'logout')."""
    return system_power_impl(action)

@mcp.tool()
def lock_screen() -> str:
    """Immediately locks the macOS screen."""
    return lock_screen_impl()

@mcp.tool()
def say_speech(text: str, voice: Optional[str] = None) -> str:
    """Speaks out text aloud using macOS text-to-speech engine."""
    return say_speech_impl(text, voice)

@mcp.tool()
def get_system_stats() -> str:
    """Returns system CPU usage, memory utilization, disk space, and battery status."""
    return get_system_stats_impl()

@mcp.tool()
def wifi_control(action: str) -> str:
    """Controls Wi-Fi power ('on', 'off', 'status')."""
    return wifi_control_impl(action)


# ==================== APP & WINDOW MANAGEMENT ====================
@mcp.tool()
def get_active_window() -> str:
    """Returns the frontmost application process name on macOS."""
    return get_active_window_impl()

@mcp.tool()
def list_applications() -> str:
    """Lists names of all currently running application processes with user interfaces."""
    return list_applications_impl()

@mcp.tool()
def open_application(app: str) -> str:
    """Launches or brings to front a specified application by name."""
    return open_application_impl(app)

@mcp.tool()
def close_application(app: str) -> str:
    """Quits a specified application by name."""
    return close_application_impl(app)

@mcp.tool()
def open_url(url: str) -> str:
    """Opens a URL in the default web browser."""
    return open_url_impl(url)

@mcp.tool()
def list_apps() -> str:
    """Lists running applications."""
    return list_apps_impl()

@mcp.tool()
def list_windows(app: Optional[str] = None) -> str:
    """Lists visible window titles of running applications."""
    return list_windows_impl(app)

@mcp.tool()
def focus_app(app: str) -> str:
    """Focuses/activates a target application."""
    return focus_app_impl(app)

@mcp.tool()
def focus_window(title: str) -> str:
    """Brings window matching title to front."""
    return focus_window_impl(title)

@mcp.tool()
def move_window(x: int, y: int, app: Optional[str] = None, title: Optional[str] = None) -> str:
    """Moves window of target application to coordinates (x, y)."""
    return move_window_impl(x, y, app, title)

@mcp.tool()
def resize_window(width: int, height: int, app: Optional[str] = None, title: Optional[str] = None) -> str:
    """Resizes window of target application to dimensions (width, height)."""
    return resize_window_impl(width, height, app, title)

@mcp.tool()
def set_space(space_number: int) -> str:
    """Switches macOS Mission Control desktop space by index."""
    return set_space_impl(space_number)


# ==================== INPUT & AUTOMATION ====================
@mcp.tool()
def keystroke_action(action: str, text: Optional[str] = None, key: Optional[str] = None, modifiers: Optional[List[str]] = None) -> str:
    """Performs keyboard automation: 'type' text or press shortcut 'key' with optional 'modifiers'."""
    return keystroke_action_impl(action, text, key, modifiers)

@mcp.tool()
def mouse_move(x: int, y: int) -> str:
    """Moves mouse cursor to (x, y) coordinates."""
    return mouse_move_impl(x, y)

@mcp.tool()
def mouse_click(x: int, y: int, button: str = "left", double: bool = False) -> str:
    """Clicks mouse button at (x, y) coordinates."""
    return mouse_click_impl(x, y, button, double)

@mcp.tool()
def mouse_drag(start_x: int, start_y: int, end_x: int, end_y: int) -> str:
    """Drags mouse from (start_x, start_y) to (end_x, end_y)."""
    return mouse_drag_impl(start_x, start_y, end_x, end_y)

@mcp.tool()
def mouse_scroll(delta_x: int = 0, delta_y: int = 0) -> str:
    """Scrolls mouse wheel by delta_x and delta_y units."""
    return mouse_scroll_impl(delta_x, delta_y)

@mcp.tool()
def key_press(key: str, modifiers: Optional[List[str]] = None) -> str:
    """Presses a single key or key combination."""
    return key_press_impl(key, modifiers)

@mcp.tool()
def type_text(text: str) -> str:
    """Types text string."""
    return type_text_impl(text)

@mcp.tool()
def shortcut_list() -> str:
    """Lists all configured macOS Shortcuts."""
    return shortcut_list_impl()

@mcp.tool()
def shortcut_run(name: str) -> str:
    """Runs a macOS Shortcut by name."""
    return shortcut_run_impl(name)

@mcp.tool()
def wait_ms(ms: int) -> str:
    """Pauses execution for specified milliseconds."""
    return wait_ms_impl(ms)


# ==================== FILESYSTEM ====================
@mcp.tool()
def fs_read(path: str) -> str:
    """Reads complete text content of a file."""
    return fs_read_impl(path)

@mcp.tool()
def fs_read_many(paths: List[str]) -> str:
    """Reads contents of multiple files at once."""
    return fs_read_many_impl(paths)

@mcp.tool()
def fs_write(path: str, content: str) -> str:
    """Writes or overwrites text content to a file."""
    return fs_write_impl(path, content)

@mcp.tool()
def fs_edit(path: str, old_str: str, new_str: str) -> str:
    """Replaces occurrences of target substring in a file."""
    return fs_edit_impl(path, old_str, new_str)

@mcp.tool()
def fs_write_pdf(path: str, content: str) -> str:
    """Writes formatted text to a PDF file."""
    return fs_write_pdf_impl(path, content)

@mcp.tool()
def fs_list(path: str = ".") -> str:
    """Lists files and directories at path."""
    return fs_list_impl(path)

@mcp.tool()
def fs_stat(path: str) -> str:
    """Gets file metadata and statistics."""
    return fs_stat_impl(path)

@mcp.tool()
def fs_copy(src: str, dst: str) -> str:
    """Copies file or directory from src to dst."""
    return fs_copy_impl(src, dst)

@mcp.tool()
def fs_move(src: str, dst: str) -> str:
    """Moves or renames file or directory from src to dst."""
    return fs_move_impl(src, dst)

@mcp.tool()
def fs_mkdir(path: str) -> str:
    """Creates a directory recursively."""
    return fs_mkdir_impl(path)

@mcp.tool()
def fs_delete(path: str) -> str:
    """Deletes a file or directory permanently."""
    return fs_delete_impl(path)

@mcp.tool()
def fs_watch_once(path: str, timeout_sec: int = 5) -> str:
    """Monitors path for modification during timeout_sec."""
    return fs_watch_once_impl(path, timeout_sec)

@mcp.tool()
def fs_xattr_get(path: str, attribute: str) -> str:
    """Gets macOS extended attribute value of a file."""
    return fs_xattr_get_impl(path, attribute)

@mcp.tool()
def fs_xattr_set(path: str, attribute: str, value: str) -> str:
    """Sets macOS extended attribute value of a file."""
    return fs_xattr_set_impl(path, attribute, value)


# ==================== FINDER & WORKSPACE ====================
@mcp.tool()
def reveal_in_finder(path: str) -> str:
    """Reveals file or directory path in macOS Finder."""
    return reveal_in_finder_impl(path)

@mcp.tool()
def get_finder_selection() -> str:
    """Returns file paths currently selected in frontmost Finder window."""
    return get_finder_selection_impl()

@mcp.tool()
def set_finder_tags(path: str, tags: List[str]) -> str:
    """Sets Finder color tags on file path."""
    return set_finder_tags_impl(path, tags)

@mcp.tool()
def quick_look(path: str) -> str:
    """Opens QuickLook preview panel for file path."""
    return quick_look_impl(path)

@mcp.tool()
def move_to_trash(path: str) -> str:
    """Moves file or directory to Trash."""
    return move_to_trash_impl(path)

@mcp.tool()
def spotlight_search(query: str) -> str:
    """Searches local filesystem via macOS mdfind Spotlight CLI."""
    return spotlight_search_impl(query)

@mcp.tool()
def empty_trash() -> str:
    """Empties macOS Trash."""
    return empty_trash_impl()


# ==================== PROCESS MANAGEMENT ====================
@mcp.tool()
def process_run(command: str, cwd: Optional[str] = None) -> str:
    """Executes shell command synchronously and returns stdout & stderr."""
    return process_run_impl(command, cwd)

@mcp.tool()
def process_start(command: str, cwd: Optional[str] = None) -> str:
    """Launches shell command in background as process."""
    return process_start_impl(command, cwd)

@mcp.tool()
def process_read_output(pid: int) -> str:
    """Reads available stdout/stderr output from background process PID."""
    return process_read_output_impl(pid)

@mcp.tool()
def process_write_input(pid: int, input_data: str) -> str:
    """Writes stdin input data to background process PID."""
    return process_write_input_impl(pid, input_data)

@mcp.tool()
def process_terminate(pid: int) -> str:
    """Gracefully terminates process PID."""
    return process_terminate_impl(pid)

@mcp.tool()
def process_list() -> str:
    """Lists running processes with PID, name, CPU %, and memory usage."""
    return process_list_impl()

@mcp.tool()
def process_kill(pid: int) -> str:
    """Forcefully kills process PID (SIGKILL)."""
    return process_kill_impl(pid)


# ==================== MEDIA & AUDIO ====================
@mcp.tool()
def media_control(action: str) -> str:
    """Controls media playback ('play', 'pause', 'playpause', 'next', 'previous')."""
    return media_control_impl(action)


# ==================== TIMERS & REMINDERS ====================
@mcp.tool()
def reminders_action(action: str, list_name: Optional[str] = "Reminders", title: Optional[str] = None, due_date: Optional[str] = None) -> str:
    """Manages macOS Reminders app ('list', 'create', 'complete')."""
    return reminders_action_impl(action, list_name, title, due_date)

@mcp.tool()
def timer_action(action: str, seconds: Optional[int] = None, label: Optional[str] = "Timer") -> str:
    """Sets or manages timers ('set', 'cancel')."""
    return timer_action_impl(action, seconds, label)


# ==================== APPLESCRIPT ====================
@mcp.tool()
def run_applescript(script: str) -> str:
    """Executes arbitrary AppleScript automation code on macOS."""
    return execute_applescript_impl(script)


# ==================== SCREENSHOT & UI ====================
@mcp.tool()
def take_screenshot(filename: Optional[str] = None) -> str:
    """Takes a screenshot of the main screen and saves to file path."""
    return take_screenshot_impl(filename)

@mcp.tool()
def capture_screen(path: Optional[str] = None) -> str:
    """Captures screen image."""
    return capture_screen_impl(path)

@mcp.tool()
def get_accessibility_tree(app: Optional[str] = None) -> str:
    """Returns accessibility tree hierarchy of application window."""
    return get_accessibility_tree_impl(app)

@mcp.tool()
def get_system_info() -> str:
    """Returns macOS operating system hardware & build info."""
    return get_system_info_impl()

@mcp.tool()
def get_screen_info() -> str:
    """Returns main display resolution and pixel density info."""
    return get_screen_info_impl()

@mcp.tool()
def clipboard_action(action: str, text: Optional[str] = None) -> str:
    """Reads or sets macOS clipboard text ('read', 'write', 'copy')."""
    return clipboard_action_impl(action, text)

@mcp.tool()
def clipboard_read() -> str:
    """Reads string content from clipboard."""
    return clipboard_read_impl()

@mcp.tool()
def clipboard_write(text: str) -> str:
    """Sets string content into clipboard."""
    return clipboard_write_impl(text)

@mcp.tool()
def notify(title: str, message: str) -> str:
    """Displays a macOS system banner notification."""
    return notify_impl(title, message)

@mcp.tool()
def prompt_user(message: str) -> str:
    """Displays an interactive modal alert prompt and returns user choice."""
    return prompt_user_impl(message)


# ==================== APP INTEGRATIONS ====================
@mcp.tool()
def calendar_create(title: str, start_time: str, end_time: Optional[str] = None) -> str:
    """Creates a new event in macOS Calendar app."""
    return calendar_create_impl(title, start_time, end_time)

@mcp.tool()
def contacts_search(query: str) -> str:
    """Searches macOS Contacts app for person matching query."""
    return contacts_search_impl(query)

@mcp.tool()
def notes_create(title: str, body: str) -> str:
    """Creates a new note in macOS Notes app."""
    return notes_create_impl(title, body)

@mcp.tool()
def mail_send_draft(to: str, subject: str, body: str) -> str:
    """Creates a new draft message in macOS Mail app."""
    return mail_send_draft_impl(to, subject, body)

@mcp.tool()
def iphone_mirror_info() -> str:
    """Returns macOS iPhone Mirroring connectivity status."""
    return iphone_mirror_info_impl()

@mcp.tool()
def analyze_image(path: str) -> str:
    """Analyzes image file and returns dimension & format metadata."""
    return analyze_image_impl(path)

@mcp.tool()
def get_knowledge_document(id: str) -> str:
    """Retrieves document from local knowledge catalog by ID."""
    return get_knowledge_document_impl(id)

@mcp.tool()
def update_knowledge_document(id: str, content: str) -> str:
    """Updates or creates document in local knowledge catalog by ID."""
    return update_knowledge_document_impl(id, content)


if __name__ == "__main__":
    mcp.run()
