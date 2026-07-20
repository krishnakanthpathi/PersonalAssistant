import subprocess
from typing import Optional, List
from .applescript import run_applescript

def get_active_window() -> str:
    """Returns the frontmost application process name on macOS."""
    script = 'tell application "System Events" to get name of first process whose frontmost is true'
    app_name = run_applescript(script)
    return f"Current active application: {app_name}"

def list_applications() -> str:
    """Lists names of all currently running application processes with user interfaces."""
    script = '''
    tell application "System Events"
        set appNames to name of every process whose background only is false
        return appNames
    end tell
    '''
    raw = run_applescript(script)
    return f"Running Applications:\n{raw}"

def open_application(app: str) -> str:
    """Launches or brings to front a specified application by name."""
    script = f'tell application "{app}" to activate'
    run_applescript(script)
    return f"Opened application: '{app}'"

def close_application(app: str) -> str:
    """Quits a specified application by name."""
    try:
        script = f'tell application "{app}" to quit'
        run_applescript(script)
        return f"Closed application: '{app}'"
    except Exception as e:
        return f"Failed to close application '{app}': {e}"

def open_url(url: str) -> str:
    """Opens a URL in the default web browser."""
    if not url.startswith("http://") and not url.startswith("https://"):
        url = "https://" + url
    subprocess.run(["open", url], check=True)
    return f"Opened URL: {url}"

def list_apps() -> str:
    """Lists running apps with details."""
    return list_applications()

def list_windows(app: Optional[str] = None) -> str:
    """Lists visible window titles of running applications."""
    try:
        if app:
            script = f'''
            tell application "System Events"
                tell process "{app}"
                    return name of every window
                end tell
            end tell
            '''
        else:
            script = '''
            tell application "System Events"
                set winList to {}
                repeat with proc in (every process whose background only is false)
                    try
                        set procName to name of proc
                        repeat with w in (every window of proc)
                            copy (procName & " - " & (name of w)) to end of winList
                        end repeat
                    end try
                end repeat
                return winList
            end tell
            '''
        res = run_applescript(script)
        return f"Windows:\n{res}"
    except Exception as e:
        return f"Failed to list windows: {e}"

def focus_app(app: str) -> str:
    """Focuses/activates a target application."""
    return open_application(app)

def focus_window(title: str) -> str:
    """Brings window matching title to front."""
    try:
        script = f'''
        tell application "System Events"
            repeat with proc in (every process whose background only is false)
                try
                    repeat with w in (every window of proc)
                        if name of w contains "{title}" then
                            set frontmost of proc to true
                            perform action "AXRaise" of w
                            return name of proc
                        end if
                    end repeat
                end try
            end repeat
        end tell
        '''
        res = run_applescript(script)
        return f"Focused window matching '{title}' (Process: {res})"
    except Exception as e:
        return f"Failed to focus window '{title}': {e}"

def move_window(x: int, y: int, app: Optional[str] = None, title: Optional[str] = None) -> str:
    """Moves window of target application or front application to coordinates (x, y)."""
    target = f'process "{app}"' if app else 'first process whose frontmost is true'
    script = f'''
    tell application "System Events"
        tell {target}
            set position of window 1 to {{{x}, {y}}}
        end tell
    end tell
    '''
    try:
        run_applescript(script)
        return f"Moved window to position ({x}, {y})"
    except Exception as e:
        return f"Failed to move window: {e}"

def resize_window(width: int, height: int, app: Optional[str] = None, title: Optional[str] = None) -> str:
    """Resizes window of target application to dimensions (width, height)."""
    target = f'process "{app}"' if app else 'first process whose frontmost is true'
    script = f'''
    tell application "System Events"
        tell {target}
            set size of window 1 to {{{width}, {height}}}
        end tell
    end tell
    '''
    try:
        run_applescript(script)
        return f"Resized window to {width}x{height}"
    except Exception as e:
        return f"Failed to resize window: {e}"

def set_space(space_number: int) -> str:
    """Switches macOS Mission Control desktop space by index."""
    # Control + Number shortcut simulation
    script = f'''
    tell application "System Events"
        key code {17 + space_number} using {{control down}}
    end tell
    '''
    run_applescript(script)
    return f"Switched to Space {space_number}"
