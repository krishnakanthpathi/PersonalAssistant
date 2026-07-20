import os
import signal
import json
import subprocess
import psutil
from typing import Optional, Dict

active_processes: Dict[int, subprocess.Popen] = {}

def process_run(command: str, cwd: Optional[str] = None) -> str:
    """Executes shell command synchronously and returns stdout & stderr."""
    res = subprocess.run(
        command,
        shell=True,
        cwd=cwd or os.getcwd(),
        capture_output=True,
        text=True
    )
    output = (
        f"Exit Code: {res.returncode}\n"
        f"--- STDOUT ---\n{res.stdout.strip()}\n"
        f"--- STDERR ---\n{res.stderr.strip()}"
    )
    return output

def process_start(command: str, cwd: Optional[str] = None) -> str:
    """Launches shell command in background as process."""
    proc = subprocess.Popen(
        command,
        shell=True,
        cwd=cwd or os.getcwd(),
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        stdin=subprocess.PIPE,
        text=True
    )
    active_processes[proc.pid] = proc
    return f"Background process launched. PID: {proc.pid}"

def process_read_output(pid: int) -> str:
    """Reads available stdout/stderr output from background process PID."""
    proc = active_processes.get(pid)
    if not proc:
        return f"No tracked active process found with PID {pid}"
    
    out, err = proc.communicate(timeout=0.2) if proc.poll() is not None else ("", "")
    status = "Terminated" if proc.poll() is not None else "Running"
    return f"Process PID {pid} ({status}):\nSTDOUT: {out}\nSTDERR: {err}"

def process_write_input(pid: int, input_data: str) -> str:
    """Writes stdin input data to background process PID."""
    proc = active_processes.get(pid)
    if not proc or proc.poll() is not None:
        return f"Process PID {pid} is not running."
    if proc.stdin:
        proc.stdin.write(input_data + "\n")
        proc.stdin.flush()
        return f"Sent input to PID {pid}"
    return f"Process PID {pid} stdin is unavailable."

def process_terminate(pid: int) -> str:
    """Gracefully terminates process PID."""
    try:
        p = psutil.Process(pid)
        p.terminate()
        return f"Terminated process PID {pid}"
    except psutil.NoSuchProcess:
        return f"Process PID {pid} does not exist."

def process_list() -> str:
    """Lists running processes with PID, name, CPU %, and memory usage."""
    procs = []
    for p in psutil.process_iter(['pid', 'name', 'cpu_percent', 'memory_percent']):
        try:
            procs.append(p.info)
        except Exception:
            pass
    # Sort by memory percent top 25
    procs.sort(key=lambda x: x.get('memory_percent') or 0, reverse=True)
    top = procs[:25]
    info = [f"PID {p['pid']} | {p['name']} | CPU: {p['cpu_percent']}% | MEM: {round(p['memory_percent'] or 0, 2)}%" for p in top]
    return f"Running Processes (Top 25 Memory):\n" + "\n".join(info)

def process_kill(pid: int) -> str:
    """Forcefully kills process PID (SIGKILL)."""
    try:
        os.kill(pid, signal.SIGKILL)
        return f"Killed process PID {pid}"
    except ProcessLookupError:
        return f"Process PID {pid} not found."
