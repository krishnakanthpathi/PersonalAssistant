import os
import subprocess
from typing import List
from .applescript import run_applescript

def reveal_in_finder(path: str) -> str:
    """Reveals file or directory path in macOS Finder."""
    abs_path = os.path.abspath(os.path.expanduser(path))
    subprocess.run(["open", "-R", abs_path], check=True)
    return f"Revealed in Finder: '{abs_path}'"

def get_finder_selection() -> str:
    """Returns file paths currently selected in frontmost Finder window."""
    script = '''
    tell application "Finder"
        set sel to selection
        set res to {}
        repeat with item_ in sel
            copy (POSIX path of (item_ as alias)) to end of res
        end repeat
        return res
    end tell
    '''
    res = run_applescript(script)
    return f"Finder Selection:\n{res}"

def set_finder_tags(path: str, tags: List[str]) -> str:
    """Sets Finder color tags on file path."""
    abs_path = os.path.abspath(os.path.expanduser(path))
    tags_arg = ",".join(tags)
    subprocess.run(["tag", "-set", tags_arg, abs_path], check=True)
    return f"Set tags [{tags_arg}] on '{abs_path}'"

def quick_look(path: str) -> str:
    """Opens QuickLook preview panel for file path."""
    abs_path = os.path.abspath(os.path.expanduser(path))
    subprocess.Popen(["qlmanage", "-p", abs_path], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    return f"Opened Quick Look preview for '{abs_path}'"

def move_to_trash(path: str) -> str:
    """Moves file or directory to Trash."""
    abs_path = os.path.abspath(os.path.expanduser(path))
    script = f'tell application "Finder" to delete move (POSIX file "{abs_path}")'
    run_applescript(script)
    return f"Moved to Trash: '{abs_path}'"

def spotlight_search(query: str) -> str:
    """Searches local filesystem via macOS mdfind Spotlight CLI."""
    res = subprocess.run(["mdfind", query], capture_output=True, text=True, check=True)
    lines = [line for line in res.stdout.splitlines() if line.strip()]
    count = len(lines)
    preview = "\n".join(lines[:20])
    return f"Found {count} matching files for Spotlight query '{query}':\n{preview}"

def empty_trash() -> str:
    """Empties macOS Trash."""
    script = 'tell application "Finder" to empty trash'
    run_applescript(script)
    return "Emptied macOS Trash."
