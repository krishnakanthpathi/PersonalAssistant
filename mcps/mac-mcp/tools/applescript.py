import subprocess

def run_applescript(script: str) -> str:
    """Executes an AppleScript code snippet using osascript subprocess and returns stdout."""
    try:
        res = subprocess.run(
            ["osascript", "-e", script],
            capture_output=True,
            text=True,
            check=True
        )
        return res.stdout.strip()
    except subprocess.CalledProcessError as e:
        err_msg = e.stderr.strip() if e.stderr else str(e)
        raise RuntimeError(f"AppleScript execution failed: {err_msg}")

def execute_applescript(script: str) -> str:
    """Executes arbitrary AppleScript automation code on macOS."""
    if not script or not script.strip():
        raise ValueError("AppleScript script content cannot be empty.")
    output = run_applescript(script)
    return output if output else "AppleScript executed successfully."
