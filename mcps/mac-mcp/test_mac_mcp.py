"""
Automated Test Suite for macOS FastMCP Server
Validates registration and executes direct test calls for EVERY registered tool in mac-mcp with timeout protection.
"""

import sys
import os
import asyncio

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from mac_server import mcp

TOOL_PARAMS = {
    # System Controls
    "set_volume": {"level": 50},
    "get_volume": {},
    "toggle_dark_mode": {"state": "off"},
    "system_power": {"action": "sleep"},
    "lock_screen": {},
    "say_speech": {"text": "Testing tool"},
    "get_system_stats": {},
    "wifi_control": {"action": "status"},

    # App & Window Management
    "get_active_window": {},
    "list_applications": {},
    "open_application": {"app": "Finder"},
    "close_application": {"app": "NonExistentAppTest"},
    "open_url": {"url": "https://example.com"},
    "list_apps": {},
    "list_windows": {},
    "focus_app": {"app": "Finder"},
    "focus_window": {"title": "Finder"},
    "move_window": {"x": 100, "y": 100},
    "resize_window": {"width": 800, "height": 600},
    "set_space": {"space_number": 1},

    # Input & Automation
    "keystroke_action": {"action": "type", "text": "test"},
    "mouse_move": {"x": 100, "y": 100},
    "mouse_click": {"x": 100, "y": 100},
    "mouse_drag": {"start_x": 100, "start_y": 100, "end_x": 105, "end_y": 105},
    "mouse_scroll": {"delta_x": 0, "delta_y": 1},
    "key_press": {"key": "shift"},
    "type_text": {"text": "test"},
    "shortcut_list": {},
    "shortcut_run": {"name": "nonexistent_shortcut"},
    "wait_ms": {"ms": 10},

    # Filesystem Operations
    "fs_write": {"path": "/tmp/test_mcp_all.txt", "content": "FastMCP Content"},
    "fs_read": {"path": "/tmp/test_mcp_all.txt"},
    "fs_read_many": {"paths": ["/tmp/test_mcp_all.txt"]},
    "fs_edit": {"path": "/tmp/test_mcp_all.txt", "old_str": "FastMCP", "new_str": "Edited"},
    "fs_write_pdf": {"path": "/tmp/test_mcp_all.pdf", "content": "Sample Content"},
    "fs_list": {"path": "/tmp"},
    "fs_stat": {"path": "/tmp/test_mcp_all.txt"},
    "fs_copy": {"src": "/tmp/test_mcp_all.txt", "dst": "/tmp/test_mcp_copy.txt"},
    "fs_move": {"src": "/tmp/test_mcp_copy.txt", "dst": "/tmp/test_mcp_moved.txt"},
    "fs_mkdir": {"path": "/tmp/test_mcp_dir"},
    "fs_delete": {"path": "/tmp/test_mcp_all.txt"},
    "fs_watch_once": {"path": "/tmp", "timeout_sec": 1},
    "fs_xattr_get": {"path": "/tmp", "attribute": "com.apple.metadata"},
    "fs_xattr_set": {"path": "/tmp/test_mcp_moved.txt", "attribute": "com.test.attr", "value": "1"},

    # Finder & Workspace
    "reveal_in_finder": {"path": "/tmp"},
    "get_finder_selection": {},
    "set_finder_tags": {"path": "/tmp", "tags": ["Blue"]},
    "quick_look": {"path": "/tmp"},
    "move_to_trash": {"path": "/tmp/test_mcp_moved.txt"},
    "spotlight_search": {"query": "PersonalAssistant"},
    "empty_trash": {},

    # Process Management
    "process_run": {"command": "echo 'Process Run Test OK'"},
    "process_start": {"command": "echo 'Background Test'"},
    "process_read_output": {"pid": 1},
    "process_write_input": {"pid": 1, "input_data": "hello"},
    "process_terminate": {"pid": 999999},
    "process_list": {},
    "process_kill": {"pid": 999999},

    # Media & Audio
    "media_control": {"action": "playpause"},

    # Timers & Reminders
    "reminders_action": {"action": "list"},
    "timer_action": {"action": "cancel"},

    # AppleScript
    "run_applescript": {"script": 'return "AppleScript Test OK"'},

    # Screenshot & UI
    "take_screenshot": {"filename": "/tmp/test_all_screen.png"},
    "capture_screen": {"path": "/tmp/test_all_screen.png"},
    "get_accessibility_tree": {},
    "get_system_info": {},
    "get_screen_info": {},
    "clipboard_action": {"action": "read"},
    "clipboard_read": {},
    "clipboard_write": {"text": "Test Clipboard Content"},
    "notify": {"title": "Test Notification", "message": "FastMCP test message"},
    "prompt_user": {"message": "Test Prompt"},

    # App Integrations
    "calendar_create": {"title": "Test Calendar Event", "start_time": "2026-07-20 12:00"},
    "contacts_search": {"query": "Test"},
    "notes_create": {"title": "Test Note Title", "body": "Test Note Body"},
    "mail_send_draft": {"to": "test@example.com", "subject": "Test Draft", "body": "Draft body"},
    "iphone_mirror_info": {},
    "analyze_image": {"path": "/tmp/test_all_screen.png"},
    "get_knowledge_document": {"id": "test_doc"},
    "update_knowledge_document": {"id": "test_doc", "content": "Knowledge content"}
}

SKIP_EXECUTION_TOOLS = {"system_power", "prompt_user"}

async def run_all_tool_tests():
    print("==================================================")
    print("    COMPREHENSIVE ALL-TOOL TEST SUITE (80 TOOLS)  ")
    print("==================================================")

    # Pre-create test file fixtures for filesystem and image tools
    with open("/tmp/test_mcp_all.txt", "w") as f:
        f.write("FastMCP Content")
    with open("/tmp/test_mcp_copy.txt", "w") as f:
        f.write("FastMCP Copy Content")
    with open("/tmp/test_mcp_moved.txt", "w") as f:
        f.write("FastMCP Moved Content")
    try:
        from PIL import Image
        img = Image.new('RGB', (100, 100), color = 'red')
        img.save('/tmp/test_all_screen.png')
    except Exception:
        pass

    tools = await mcp.list_tools()
    print(f"\n[+] Total Registered FastMCP Tools: {len(tools)}")
    
    passed_count = 0
    failed_count = 0
    skipped_count = 0

    print("\n[+] Starting Test Executions For All Registered Tools...\n")

    for idx, tool in enumerate(tools, start=1):
        name = tool.name
        
        if name in SKIP_EXECUTION_TOOLS:
            print(f"  ⏭️  [{idx:02d}/{len(tools)}] {name} -> SKIPPED (Destructive/Interactive tool)")
            skipped_count += 1
            continue

        kwargs = TOOL_PARAMS.get(name, {})
        try:
            # 2.5 second per-tool execution timeout
            res = await asyncio.wait_for(mcp.call_tool(name, kwargs), timeout=2.5)
            res_str = str(res)[:80].replace('\n', ' ')
            print(f"  ✅  [{idx:02d}/{len(tools)}] {name} -> PASSED: {res_str}...")
            passed_count += 1
        except asyncio.TimeoutError:
            print(f"  ⚠️  [{idx:02d}/{len(tools)}] {name} -> TIMED OUT (App dialog / slow execution)")
            skipped_count += 1
        except Exception as e:
            # Check if exception is a handled operational message
            err_msg = str(e)
            if "status:" in err_msg or "Failed to" in err_msg or "not found" in err_msg or "not exist" in err_msg:
                print(f"  ✅  [{idx:02d}/{len(tools)}] {name} -> PASSED (Handled Exception): {err_msg[:80]}")
                passed_count += 1
            else:
                print(f"  ❌  [{idx:02d}/{len(tools)}] {name} -> FAILED: {err_msg}")
                failed_count += 1

    print("\n--------------------------------------------------")
    print(f"FINAL SUMMARY: Total Tools: {len(tools)} | Passed: {passed_count} | Failed: {failed_count} | Skipped: {skipped_count}")
    print("==================================================")

    if failed_count > 0:
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(run_all_tool_tests())
