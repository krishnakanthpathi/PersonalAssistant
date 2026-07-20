import time
import subprocess
from typing import Optional
from .applescript import run_applescript

def reminders_action(
    action: str,
    list_name: Optional[str] = "Reminders",
    title: Optional[str] = None,
    due_date: Optional[str] = None
) -> str:
    """Manages macOS Reminders app ('list', 'create', 'complete')."""
    act = action.lower().strip()
    target_list = list_name or "Reminders"

    if act in ("list", "get"):
        script = f'''
        tell application "Reminders"
            try
                set rList to list "{target_list}"
                set rems to name of every reminder of rList whose completed is false
                return rems
            on error
                return "List not found or empty"
            end try
        end tell
        '''
        res = run_applescript(script)
        return f"Reminders in '{target_list}':\n{res}"

    elif act == "create":
        if not title:
            raise ValueError("Parameter 'title' is required to create a reminder.")
        script = f'''
        tell application "Reminders"
            set rList to list "{target_list}"
            make new reminder at rList with properties {{name:"{title}"}}
        end tell
        '''
        run_applescript(script)
        return f"Created reminder '{title}' in list '{target_list}'"

    elif act == "complete":
        if not title:
            raise ValueError("Parameter 'title' is required to complete a reminder.")
        script = f'''
        tell application "Reminders"
            set rList to list "{target_list}"
            set (completed of first reminder of rList whose name contains "{title}") to true
        end tell
        '''
        run_applescript(script)
        return f"Marked reminder '{title}' as completed"
    else:
        raise ValueError(f"Unknown reminders action: {action}. Supported: list, create, complete")

def timer_action(action: str, seconds: Optional[int] = None, label: Optional[str] = "Timer") -> str:
    """Sets or manages timers ('set', 'cancel')."""
    act = action.lower().strip()
    if act == "set":
        if not seconds or seconds <= 0:
            raise ValueError("Parameter 'seconds' must be positive for action='set'")
        lbl = label or "Timer"
        # Display alert/notification when timer finishes
        cmd = f"sleep {seconds} && osascript -e 'display notification \"{lbl}\" with title \"Timer Done!\" sound name \"Glass\"'"
        subprocess.Popen(cmd, shell=True)
        return f"Timer set for {seconds} seconds ('{lbl}')"
    elif act == "cancel":
        subprocess.run(["pkill", "-f", "display notification"], stderr=subprocess.DEVNULL)
        return "Timers cancelled."
    else:
        raise ValueError(f"Unknown timer action: {action}. Supported: set, cancel")
