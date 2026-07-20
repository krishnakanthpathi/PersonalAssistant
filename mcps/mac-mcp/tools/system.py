import subprocess
import psutil
from typing import Optional
from .applescript import run_applescript

def set_volume(level: int) -> str:
    """Sets macOS system volume output level (0 to 100)."""
    val = max(0, min(100, level))
    run_applescript(f"set volume output volume {val}")
    return f"System volume set to {val}%"

def get_volume() -> str:
    """Gets current macOS system volume output level and mute status."""
    vol = run_applescript("output volume of (get volume settings)")
    muted = run_applescript("output muted of (get volume settings)")
    return f"Current Volume: {vol}%, Muted: {muted}"

def toggle_dark_mode(state: Optional[str] = None) -> str:
    """Toggles or sets dark mode on macOS (state: 'on', 'off', or 'toggle')."""
    if state == "on":
        script = 'tell application "System Events" to set dark mode of appearance preferences to true'
    elif state == "off":
        script = 'tell application "System Events" to set dark mode of appearance preferences to false'
    else:
        script = 'tell application "System Events" to set dark mode of appearance preferences to not dark mode of appearance preferences'
    run_applescript(script)
    current = run_applescript('tell application "System Events" to get dark mode of appearance preferences')
    is_dark = current.lower() == "true"
    return f"Dark mode is now {'enabled' if is_dark else 'disabled'}"

def system_power(action: str) -> str:
    """Triggers system power state action ('sleep', 'restart', 'shutdown', 'logout')."""
    act = action.lower().strip()
    if act == "sleep":
        run_applescript('tell application "System Events" to sleep')
        return "System put to sleep."
    elif act == "restart":
        run_applescript('tell application "System Events" to restart')
        return "System restart initiated."
    elif act == "shutdown":
        run_applescript('tell application "System Events" to shut down')
        return "System shutdown initiated."
    elif act == "logout":
        run_applescript('tell application "System Events" to log out')
        return "System logout initiated."
    else:
        raise ValueError(f"Unknown system power action: {action}. Supported: sleep, restart, shutdown, logout")

def lock_screen() -> str:
    """Immediately locks the macOS screen."""
    subprocess.run(["pmset", "displaysleepnow"], check=True)
    return "Screen locked."

def say_speech(text: str, voice: Optional[str] = None) -> str:
    """Speaks out text aloud using macOS text-to-speech engine."""
    cmd = ["say"]
    if voice:
        cmd.extend(["-v", voice])
    cmd.append(text)
    subprocess.run(cmd, check=True)
    return f"Spoke text: '{text}'"

def get_system_stats() -> str:
    """Returns system CPU usage, memory utilization, disk space, and battery status."""
    cpu_usage = psutil.cpu_percent(interval=0.5)
    mem = psutil.virtual_memory()
    disk = psutil.disk_usage('/')
    
    battery_str = "No battery detected / AC desktop"
    if hasattr(psutil, "sensors_battery"):
        bat = psutil.sensors_battery()
        if bat:
            battery_str = f"{bat.percent}% ({'Plugged in' if bat.power_plugged else 'On battery'})"

    stats = (
        f"CPU Usage: {cpu_usage}%\n"
        f"RAM: {mem.percent}% used ({round(mem.used/(1024**3), 2)} GB / {round(mem.total/(1024**3), 2)} GB)\n"
        f"Disk (/): {disk.percent}% used ({round(disk.used/(1024**3), 2)} GB / {round(disk.total/(1024**3), 2)} GB free)\n"
        f"Battery: {battery_str}"
    )
    return stats

def wifi_control(action: str) -> str:
    """Controls Wi-Fi power ('on', 'off', 'status')."""
    act = action.lower().strip()
    if act == "on":
        subprocess.run(["networksetup", "-setairportpower", "en0", "on"], check=True)
        return "Wi-Fi turned ON"
    elif act == "off":
        subprocess.run(["networksetup", "-setairportpower", "en0", "off"], check=True)
        return "Wi-Fi turned OFF"
    elif act == "status":
        res = subprocess.run(["networksetup", "-getairportpower", "en0"], capture_output=True, text=True, check=True)
        return res.stdout.strip()
    else:
        raise ValueError(f"Unknown Wi-Fi action: {action}. Supported: on, off, status")
