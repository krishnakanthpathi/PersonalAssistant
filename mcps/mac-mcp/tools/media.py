from .applescript import run_applescript

def media_control(action: str) -> str:
    """Controls media playback ('play', 'pause', 'playpause', 'next', 'previous')."""
    act = action.lower().strip()
    key_codes = {
        "play": 16,
        "pause": 16,
        "playpause": 16,
        "next": 19,
        "previous": 20,
        "prev": 20
    }
    if act in key_codes:
        # Use AppleScript to trigger Music / Spotify or media key
        script = f'''
        tell application "System Events"
            try
                tell application "Music"
                    if "{act}" is "playpause" then playpause
                    if "{act}" is "next" then next track
                    if "{act}" is "previous" then previous track
                end tell
            on error
                tell application "Spotify"
                    if "{act}" is "playpause" then playpause
                    if "{act}" is "next" then next track
                    if "{act}" is "previous" then previous track
                end tell
            end try
        end tell
        '''
        run_applescript(script)
        return f"Media control executed: '{action}'"
    else:
        raise ValueError(f"Unknown media action: {action}. Supported: play, pause, playpause, next, previous")
