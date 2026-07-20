import os
import shutil
import time
import json
import subprocess
from typing import List, Optional, Dict, Any

def fs_read(path: str) -> str:
    """Reads complete text content of a file."""
    abs_path = os.path.abspath(os.path.expanduser(path))
    with open(abs_path, 'r', encoding='utf-8', errors='replace') as f:
        return f.read()

def fs_read_many(paths: List[str]) -> str:
    """Reads contents of multiple files at once."""
    results = {}
    for p in paths:
        try:
            results[p] = fs_read(p)
        except Exception as e:
            results[p] = f"Error reading file: {e}"
    return json.dumps(results, indent=2)

def fs_write(path: str, content: str) -> str:
    """Writes or overwrites text content to a file."""
    abs_path = os.path.abspath(os.path.expanduser(path))
    os.makedirs(os.path.dirname(abs_path), exist_ok=True)
    with open(abs_path, 'w', encoding='utf-8') as f:
        f.write(content)
    return f"Successfully wrote {len(content)} characters to {abs_path}"

def fs_edit(path: str, old_str: str, new_str: str) -> str:
    """Replaces occurrences of target substring in a file."""
    content = fs_read(path)
    if old_str not in content:
        raise ValueError(f"Target substring '{old_str}' not found in file {path}")
    new_content = content.replace(old_str, new_str)
    fs_write(path, new_content)
    return f"Successfully edited file {path}"

def fs_write_pdf(path: str, content: str) -> str:
    """Writes formatted text to a PDF file using cups/enscript or basic PDF generator."""
    abs_path = os.path.abspath(os.path.expanduser(path))
    txt_path = abs_path + ".tmp.txt"
    fs_write(txt_path, content)
    try:
        subprocess.run(["cupsfilter", txt_path], stdout=open(abs_path, 'wb'), check=True)
        os.remove(txt_path)
        return f"Successfully created PDF document at {abs_path}"
    except Exception as e:
        if os.path.exists(txt_path):
            os.remove(txt_path)
        # Fallback to saving as txt if cupsfilter fails
        fs_write(abs_path + ".txt", content)
        return f"PDF filter unavailable, saved output to {abs_path}.txt instead ({e})"

def fs_list(path: str = ".") -> str:
    """Lists files and directories at path."""
    abs_path = os.path.abspath(os.path.expanduser(path))
    entries = os.listdir(abs_path)
    info = []
    for entry in sorted(entries):
        full = os.path.join(abs_path, entry)
        kind = "DIR" if os.path.isdir(full) else "FILE"
        size = os.path.getsize(full) if kind == "FILE" else "-"
        info.append(f"[{kind}] {entry} ({size} bytes)")
    return f"Directory contents of {abs_path}:\n" + "\n".join(info)

def fs_stat(path: str) -> str:
    """Gets file metadata and statistics (size, timestamps, permissions)."""
    abs_path = os.path.abspath(os.path.expanduser(path))
    st = os.stat(abs_path)
    details = {
        "path": abs_path,
        "size": st.st_size,
        "created": time.ctime(st.st_ctime),
        "modified": time.ctime(st.st_mtime),
        "accessed": time.ctime(st.st_atime),
        "mode": oct(st.st_mode),
        "is_dir": os.path.isdir(abs_path)
    }
    return json.dumps(details, indent=2)

def fs_copy(src: str, dst: str) -> str:
    """Copies file or directory from src to dst."""
    abs_src = os.path.abspath(os.path.expanduser(src))
    abs_dst = os.path.abspath(os.path.expanduser(dst))
    if os.path.isdir(abs_src):
        shutil.copytree(abs_src, abs_dst, dirs_exist_ok=True)
    else:
        shutil.copy2(abs_src, abs_dst)
    return f"Copied '{abs_src}' to '{abs_dst}'"

def fs_move(src: str, dst: str) -> str:
    """Moves or renames file or directory from src to dst."""
    abs_src = os.path.abspath(os.path.expanduser(src))
    abs_dst = os.path.abspath(os.path.expanduser(dst))
    shutil.move(abs_src, abs_dst)
    return f"Moved '{abs_src}' to '{abs_dst}'"

def fs_mkdir(path: str) -> str:
    """Creates a directory recursively."""
    abs_path = os.path.abspath(os.path.expanduser(path))
    os.makedirs(abs_path, exist_ok=True)
    return f"Created directory '{abs_path}'"

def fs_delete(path: str) -> str:
    """Deletes a file or directory permanently."""
    abs_path = os.path.abspath(os.path.expanduser(path))
    if os.path.isdir(abs_path):
        shutil.rmtree(abs_path)
    else:
        os.remove(abs_path)
    return f"Deleted '{abs_path}'"

def fs_watch_once(path: str, timeout_sec: int = 5) -> str:
    """Monitors path for modification during timeout_sec."""
    abs_path = os.path.abspath(os.path.expanduser(path))
    initial_mtime = os.path.getmtime(abs_path) if os.path.exists(abs_path) else 0
    start = time.time()
    while time.time() - start < timeout_sec:
        time.sleep(0.5)
        current_mtime = os.path.getmtime(abs_path) if os.path.exists(abs_path) else 0
        if current_mtime != initial_mtime:
            return f"File '{abs_path}' modified at {time.ctime(current_mtime)}"
    return f"No modifications detected on '{abs_path}' during {timeout_sec}s watch period."

def fs_xattr_get(path: str, attribute: str) -> str:
    """Gets macOS extended attribute value of a file."""
    try:
        abs_path = os.path.abspath(os.path.expanduser(path))
        res = subprocess.run(["xattr", "-p", attribute, abs_path], capture_output=True, text=True, check=True)
        return res.stdout.strip()
    except Exception as e:
        return f"Extended attribute '{attribute}' status: {e}"

def fs_xattr_set(path: str, attribute: str, value: str) -> str:
    """Sets macOS extended attribute value of a file."""
    try:
        abs_path = os.path.abspath(os.path.expanduser(path))
        subprocess.run(["xattr", "-w", attribute, value, abs_path], check=True)
        return f"Set extended attribute '{attribute}' on '{abs_path}'"
    except Exception as e:
        return f"Failed to set extended attribute: {e}"
