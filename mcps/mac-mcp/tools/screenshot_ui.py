import os
import sys
import json
import time
import subprocess
from typing import Optional
from .applescript import run_applescript

def take_screenshot(filename: Optional[str] = None) -> str:
    """Takes a screenshot of the main screen and saves to file path."""
    save_path = filename or f"/tmp/screenshot_{int(time.time())}.png"
    abs_path = os.path.abspath(os.path.expanduser(save_path))
    os.makedirs(os.path.dirname(abs_path), exist_ok=True)
    try:
        subprocess.run(["screencapture", "-x", abs_path], check=True, capture_output=True, text=True)
        return f"Screenshot saved to '{abs_path}'"
    except subprocess.CalledProcessError as e:
        return f"Failed to capture screenshot (Screen Recording permission required): {e.stderr or e}"

def capture_screen(path: Optional[str] = None) -> str:
    """Captures screen image."""
    return take_screenshot(path)

def get_accessibility_tree(app: Optional[str] = None) -> str:
    """Returns accessibility tree hierarchy of application window as JSON."""
    target_app = app
    if not target_app:
        target_app = run_applescript('tell application "System Events" to get name of first process whose frontmost is true')
    
    script = f'''
    tell application "System Events"
        tell process "{target_app}"
            try
                set w to window 1
                set winTitle to title of w
                set uiElems to role of every UI element of w
                return "App: {target_app}, Window: " & winTitle & ", UI Elements: " & (uiElems as string)
            on error err
                return "Error fetching UI elements: " & err
            end try
        end tell
    end tell
    '''
    return run_applescript(script)

def get_system_info() -> str:
    """Returns macOS operating system hardware & build info."""
    res = subprocess.run(["sw_vers"], capture_output=True, text=True, check=True)
    uname = subprocess.run(["uname", "-m"], capture_output=True, text=True, check=True)
    return f"System Info:\n{res.stdout.strip()}\nArchitecture: {uname.stdout.strip()}"

def get_screen_info() -> str:
    """Returns main display resolution and pixel density info."""
    script = 'tell application "Finder" to get bounds of window of desktop'
    res = run_applescript(script)
    return f"Display Bounds (desktop window): {res}"

def clipboard_action(action: str, text: Optional[str] = None) -> str:
    """Reads or sets macOS clipboard text ('read', 'write', 'copy')."""
    act = action.lower().strip()
    if act in ("read", "get"):
        return clipboard_read()
    elif act in ("write", "set", "copy"):
        if text is None:
            raise ValueError("Parameter 'text' is required to write to clipboard.")
        return clipboard_write(text)
    else:
        raise ValueError(f"Unknown clipboard action: {action}. Supported: read, write")

def clipboard_read() -> str:
    """Reads string content from clipboard."""
    res = subprocess.run(["pbpaste"], capture_output=True, text=True, check=True)
    return res.stdout

def clipboard_write(text: str) -> str:
    """Sets string content into clipboard."""
    proc = subprocess.Popen(["pbcopy"], stdin=subprocess.PIPE, text=True)
    proc.communicate(input=text)
    return f"Copied {len(text)} characters to clipboard."

def notify(title: str, message: str) -> str:
    """Displays a macOS system banner notification."""
    script = f'display notification "{message}" with title "{title}"'
    run_applescript(script)
    return f"Displayed notification '{title}'"

def prompt_user(message: str) -> str:
    """Displays an interactive modal alert prompt and returns user choice."""
    script = f'display dialog "{message}" buttons {{"Cancel", "OK"}} default button "OK"'
    res = run_applescript(script)
    return f"User response: {res}"
