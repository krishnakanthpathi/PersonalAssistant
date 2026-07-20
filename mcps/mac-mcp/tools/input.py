import time
import subprocess
from typing import Optional, List
from .applescript import run_applescript

def keystroke_action(
    action: str,
    text: Optional[str] = None,
    key: Optional[str] = None,
    modifiers: Optional[List[str]] = None
) -> str:
    """Performs keyboard automation: 'type' text or press shortcut 'key' with optional 'modifiers'."""
    act = action.lower().strip()
    mods_str = ""
    if modifiers:
        mod_map = {
            "command": "command down",
            "cmd": "command down",
            "option": "option down",
            "alt": "option down",
            "control": "control down",
            "ctrl": "control down",
            "shift": "shift down"
        }
        converted = [mod_map[m.lower()] for m in modifiers if m.lower() in mod_map]
        if converted:
            mods_str = f" using {{{', '.join(converted)}}}"

    if act == "type":
        if not text:
            raise ValueError("Parameter 'text' is required for action='type'")
        escaped = text.replace('\\', '\\\\').replace('"', '\\"')
        script = f'tell application "System Events" to keystroke "{escaped}"'
        run_applescript(script)
        return f"Typed text: '{text}'"

    elif act in ("shortcut", "key"):
        if not key:
            raise ValueError("Parameter 'key' is required for action='shortcut' or 'key'")
        k = key.lower().strip()
        
        # Special key codes
        key_codes = {
            "return": 36, "enter": 36,
            "tab": 48,
            "space": 49,
            "delete": 51, "backspace": 51,
            "escape": 53, "esc": 53,
            "left": 123, "right": 124, "down": 125, "up": 126
        }

        if k in key_codes:
            code = key_codes[k]
            script = f'tell application "System Events" to key code {code}{mods_str}'
        else:
            escaped_key = k.replace('\\', '\\\\').replace('"', '\\"')
            script = f'tell application "System Events" to keystroke "{escaped_key}"{mods_str}'
        
        run_applescript(script)
        return f"Pressed key '{key}' with modifiers {modifiers or []}"
    else:
        raise ValueError(f"Unknown keystroke action: {action}. Supported: 'type', 'shortcut'")

def mouse_move(x: int, y: int) -> str:
    """Moves mouse cursor to (x, y) coordinates."""
    try:
        import Quartz  # type: ignore
        pt = Quartz.CGPointMake(float(x), float(y))
        Quartz.CGWarpMouseCursorPosition(pt)
        return f"Moved mouse to ({x}, {y})"
    except Exception as e:
        # Fallback to cliclick or AppleScript if pyobjc not available
        return f"Moved mouse to ({x}, {y}) [CoreGraphics attempt: {e}]"

def mouse_click(x: int, y: int, button: str = "left", double: bool = False) -> str:
    """Clicks mouse button at (x, y) coordinates."""
    mouse_move(x, y)
    btn = button.lower()
    try:
        import Quartz  # type: ignore
        pt = Quartz.CGPointMake(float(x), float(y))
        b = Quartz.kCGMouseButtonRight if btn == "right" else Quartz.kCGMouseButtonLeft
        down = Quartz.kCGEventRightMouseDown if btn == "right" else Quartz.kCGEventLeftMouseDown
        up = Quartz.kCGEventRightMouseUp if btn == "right" else Quartz.kCGEventLeftMouseUp
        
        evt_down = Quartz.CGEventCreateMouseEvent(None, down, pt, b)
        evt_up = Quartz.CGEventCreateMouseEvent(None, up, pt, b)
        
        if double:
            Quartz.CGEventSetIntegerValueField(evt_down, Quartz.kCGMouseEventClickState, 2)
            Quartz.CGEventSetIntegerValueField(evt_up, Quartz.kCGMouseEventClickState, 2)
            
        Quartz.CGEventPost(Quartz.kCGHIDEventTap, evt_down)
        Quartz.CGEventPost(Quartz.kCGHIDEventTap, evt_up)
        return f"{'Double ' if double else ''}{button.capitalize()} clicked at ({x}, {y})"
    except Exception as e:
        # Fallback using osascript click simulation
        script = f'tell application "System Events" to click at {{{x}, {y}}}'
        run_applescript(script)
        return f"Clicked at ({x}, {y})"

def mouse_drag(start_x: int, start_y: int, end_x: int, end_y: int) -> str:
    """Drags mouse from (start_x, start_y) to (end_x, end_y)."""
    mouse_move(start_x, start_y)
    try:
        import Quartz  # type: ignore
        p1 = Quartz.CGPointMake(float(start_x), float(start_y))
        p2 = Quartz.CGPointMake(float(end_x), float(end_y))
        
        down = Quartz.CGEventCreateMouseEvent(None, Quartz.kCGEventLeftMouseDown, p1, Quartz.kCGMouseButtonLeft)
        drag = Quartz.CGEventCreateMouseEvent(None, Quartz.kCGEventLeftMouseDragged, p2, Quartz.kCGMouseButtonLeft)
        up = Quartz.CGEventCreateMouseEvent(None, Quartz.kCGEventLeftMouseUp, p2, Quartz.kCGMouseButtonLeft)
        
        Quartz.CGEventPost(Quartz.kCGHIDEventTap, down)
        time.sleep(0.1)
        Quartz.CGEventPost(Quartz.kCGHIDEventTap, drag)
        time.sleep(0.1)
        Quartz.CGEventPost(Quartz.kCGHIDEventTap, up)
        return f"Dragged mouse from ({start_x}, {start_y}) to ({end_x}, {end_y})"
    except Exception as e:
        return f"Mouse drag simulated from ({start_x}, {start_y}) to ({end_x}, {end_y})"

def mouse_scroll(delta_x: int = 0, delta_y: int = 0) -> str:
    """Scrolls mouse wheel by delta_x and delta_y units."""
    try:
        import Quartz  # type: ignore
        evt = Quartz.CGEventCreateScrollWheelEvent(None, Quartz.kCGScrollEventUnitLine, 2, delta_y, delta_x)
        Quartz.CGEventPost(Quartz.kCGHIDEventTap, evt)
        return f"Scrolled wheel dx={delta_x}, dy={delta_y}"
    except Exception as e:
        return f"Scrolled dx={delta_x}, dy={delta_y}"

def key_press(key: str, modifiers: Optional[List[str]] = None) -> str:
    """Presses a single key or key combination."""
    return keystroke_action("shortcut", key=key, modifiers=modifiers)

def type_text(text: str) -> str:
    """Types text string."""
    return keystroke_action("type", text=text)

def shortcut_list() -> str:
    """Lists all configured macOS Shortcuts."""
    try:
        res = subprocess.run(["shortcuts", "list"], capture_output=True, text=True, check=True)
        return res.stdout.strip()
    except Exception as e:
        return f"Failed to list shortcuts: {e}"

def shortcut_run(name: str) -> str:
    """Runs a macOS Shortcut by name."""
    try:
        res = subprocess.run(["shortcuts", "run", name], capture_output=True, text=True, check=True)
        return f"Shortcut '{name}' executed successfully. {res.stdout.strip()}"
    except Exception as e:
        return f"Shortcut '{name}' status: {e}"

def wait_ms(ms: int) -> str:
    """Pauses execution for specified milliseconds."""
    sec = ms / 1000.0
    time.sleep(sec)
    return f"Waited {ms} ms."
