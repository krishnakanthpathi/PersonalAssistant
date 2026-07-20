import os
import json
from typing import Optional
from .applescript import run_applescript

def calendar_create(title: str, start_time: str, end_time: Optional[str] = None) -> str:
    """Creates a new event in macOS Calendar app."""
    try:
        script = f'''
        tell application "Calendar"
            tell calendar 1
                make new event with properties {{summary:"{title}"}}
            end tell
        end tell
        '''
        run_applescript(script)
        return f"Created event '{title}' in Calendar."
    except Exception as e:
        return f"Calendar operation status: {e}"

def contacts_search(query: str) -> str:
    """Searches macOS Contacts app for person matching query."""
    try:
        script = f'''
        tell application "Contacts"
            set matches to name of every person whose name contains "{query}"
            return matches
        end tell
        '''
        res = run_applescript(script)
        return f"Contacts matching '{query}':\n{res}"
    except Exception as e:
        return f"Contacts search status: {e}"

def notes_create(title: str, body: str) -> str:
    """Creates a new note in macOS Notes app."""
    try:
        escaped_title = title.replace('"', '\\"')
        escaped_body = body.replace('"', '\\"')
        script = f'''
        tell application "Notes"
            make new note at folder "Notes" with properties {{name:"{escaped_title}", body:"{escaped_body}"}}
        end tell
        '''
        run_applescript(script)
        return f"Created Note titled '{title}'."
    except Exception as e:
        return f"Notes operation status: {e}"

def mail_send_draft(to: str, subject: str, body: str) -> str:
    """Creates a new draft message in macOS Mail app."""
    try:
        script = f'''
        tell application "Mail"
            set msg to make new outgoing message with properties {{subject:"{subject}", content:"{body}", visible:true}}
            tell msg
                make new to recipient at end of to recipients with properties {{address:"{to}"}}
            end tell
        end tell
        '''
        run_applescript(script)
        return f"Created Mail draft to '{to}' with subject '{subject}'."
    except Exception as e:
        return f"Mail operation status: {e}"

def iphone_mirror_info() -> str:
    """Returns macOS iPhone Mirroring connectivity status."""
    script = 'tell application "System Events" to get name of every process whose name contains "iPhone Mirroring"'
    res = run_applescript(script)
    active = "iPhone Mirroring" in res
    return f"iPhone Mirroring status: {'Running' if active else 'Not running'}"

def analyze_image(path: str) -> str:
    """Analyzes image file and returns dimension & format metadata."""
    abs_path = os.path.abspath(os.path.expanduser(path))
    if not os.path.exists(abs_path):
        raise FileNotFoundError(f"Image path '{abs_path}' does not exist.")
    
    try:
        from PIL import Image
        with Image.open(abs_path) as img:
            info = {
                "path": abs_path,
                "format": img.format,
                "mode": img.mode,
                "width": img.width,
                "height": img.height
            }
            return json.dumps(info, indent=2)
    except Exception as e:
        return f"Analyzed file '{abs_path}' (metadata inspection error: {e})"

def get_knowledge_document(id: str) -> str:
    """Retrieves document from local knowledge catalog by ID."""
    catalog_path = os.path.expanduser(f"~/Desktop/Jarvis/PersonalAssistant/backend/data/knowledge_catalog/{id}.json")
    if os.path.exists(catalog_path):
        with open(catalog_path, 'r', encoding='utf-8') as f:
            return f.read()
    return f"Knowledge document '{id}' not found."

def update_knowledge_document(id: str, content: str) -> str:
    """Updates or creates document in local knowledge catalog by ID."""
    catalog_dir = os.path.expanduser("~/Desktop/Jarvis/PersonalAssistant/backend/data/knowledge_catalog")
    os.makedirs(catalog_dir, exist_ok=True)
    catalog_path = os.path.join(catalog_dir, f"{id}.json")
    with open(catalog_path, 'w', encoding='utf-8') as f:
        f.write(content)
    return f"Updated knowledge document '{id}'."
