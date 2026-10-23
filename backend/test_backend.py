import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from main import app
from schemas import MAX_NOTE_LENGTH
from demo_service import parse_local_demo_tasks, parse_local_demo_notes
from ollama_service import check_ollama_health

client = TestClient(app)

# 1. Existing System & Task Tests
def test_root_endpoint():
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "online"
    assert "Local" in data["privacy"]

def test_health_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert "ollama_reachable" in data
    assert "configured_model" in data
    assert "model_available" in data
    assert "installed_models" in data
    assert "mode" in data
    assert data["backend_status"] == "online"

def test_demo_service_logic():
    raw_input = "urgent fix critical memory leak; review PR tomorrow; buy almond milk"
    tasks = parse_local_demo_tasks(raw_input)
    assert len(tasks) == 3
    assert tasks[0].priority == "High"
    assert tasks[0].suggested_order == 1
    assert all(not t.completed for t in tasks)

def test_organize_endpoint_empty_input():
    response = client.post("/api/tasks/organize", json={"raw_text": "   "})
    assert response.status_code == 400

def test_organize_endpoint_explicit_demo():
    payload = {
        "raw_text": "review quarterly budget; schedule dental checkup",
        "force_demo": True
    }
    response = client.post("/api/tasks/organize", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["source"] == "local_demo"
    assert data["model_used"] is None
    assert len(data["tasks"]) == 2
    assert "Local Demo Mode" in data["message"]

def test_organize_endpoint_live_inference_if_available():
    health = check_ollama_health()
    if health["reachable"] and health["model_available"]:
        payload = {
            "raw_text": "fix database index crash; buy coffee",
            "force_demo": False
        }
        response = client.post("/api/tasks/organize", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["source"] in ["local_ai", "local_demo"]
        assert len(data["tasks"]) >= 1


# 2. Notes Summarizer Tests
def test_summarize_notes_empty_input():
    """Verify 400 Bad Request on empty or whitespace-only notes input."""
    response = client.post("/api/notes/summarize", json={"raw_notes": "   "})
    assert response.status_code == 400
    assert "cannot be empty" in response.json()["detail"]

def test_summarize_notes_excessive_length():
    """Verify 400 Bad Request when note exceeds max supported length."""
    long_text = "x" * (MAX_NOTE_LENGTH + 50)
    response = client.post("/api/notes/summarize", json={"raw_notes": long_text})
    assert response.status_code == 422 or response.status_code == 400

def test_summarize_notes_demo_mode_valid_output():
    """Verify demo mode extracts valid summary, key points, and action items."""
    sample_notes = (
        "Weekly Engineering Sync:\n"
        "We decided to migrate the frontend to Vite and Tailwind for Hacktoberfest 2026.\n"
        "Action items:\n"
        "- todo: Alex needs to review the security policy\n"
        "- need to update documentation before launch\n"
        "The backend will remain local with zero cloud telemetry."
    )
    payload = {
        "raw_notes": sample_notes,
        "force_demo": True
    }
    response = client.post("/api/notes/summarize", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["source"] == "local_demo"
    assert data["model_used"] is None
    assert len(data["summary"]) > 0
    assert len(data["key_points"]) > 0
    assert len(data["action_items"]) > 0
    assert any("Alex" in item or "todo" in item.lower() for item in data["action_items"])

def test_summarize_notes_unavailable_ollama():
    """Verify graceful fallback to local demo mode when Ollama is unreachable."""
    sample_notes = "Meeting notes on quarterly infrastructure roadmap. Must deploy by Friday."
    payload = {
        "raw_notes": sample_notes,
        "force_demo": False
    }
    # Mock summarize_notes_with_ollama to raise ConnectionError
    with patch("main.summarize_notes_with_ollama", side_effect=ConnectionError("Ollama unreachable on port 11434")):
        response = client.post("/api/notes/summarize", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["source"] == "local_demo"
        assert "unreachable" in data["message"].lower() or "unreachable" in (data.get("warning") or "").lower()
        assert len(data["summary"]) > 0

def test_summarize_notes_malformed_ai_output():
    """Verify graceful fallback to local demo mode when model returns invalid JSON output."""
    sample_notes = "Sprint planning session: team commits to completing 5 tickets."
    payload = {
        "raw_notes": sample_notes,
        "force_demo": False
    }
    # Mock summarize_notes_with_ollama to raise ValueError (malformed JSON)
    with patch("main.summarize_notes_with_ollama", side_effect=ValueError("Model generated invalid JSON format")):
        response = client.post("/api/notes/summarize", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["source"] == "local_demo"
        assert "non-standard output" in data["message"].lower() or "parsing" in (data.get("warning") or "").lower()
        assert len(data["summary"]) > 0

def test_summarize_notes_live_inference_if_available():
    """Verify live Ollama summarization if model is running."""
    health = check_ollama_health()
    if health["reachable"] and health["model_available"]:
        sample_notes = (
            "Sprint retrospective notes: We completed the auth service refactor. "
            "Action item: need to deploy staging build before 5pm. "
            "Decision made: keep all inference completely local via Ollama."
        )
        payload = {
            "raw_notes": sample_notes,
            "force_demo": False
        }
        response = client.post("/api/notes/summarize", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["source"] in ["local_ai", "local_demo"]
        assert len(data["summary"]) > 0


# 3. File Organizer Safety & Operation Tests
import tempfile
import os
from pathlib import Path

def test_file_organizer_scan_unapproved_directory():
    """Verify 403 Forbidden when requesting directory outside approved roots (e.g. /etc or /tmp)."""
    response = client.post("/api/files/scan", json={"directory_path": "/etc"})
    assert response.status_code == 403
    assert "not within any approved directory" in response.json()["detail"]

def test_file_organizer_path_traversal_rejection():
    """Verify path traversal attempts (../) outside approved roots are rejected with 403."""
    base_docs = Path(__file__).resolve().parent.parent / "docs"
    traversal_path = str(base_docs) + "/../../../../../../etc"
    response = client.post("/api/files/scan", json={"directory_path": traversal_path})
    assert response.status_code == 403
    assert "not within any approved directory" in response.json()["detail"]

def test_file_organizer_dry_run_and_safe_apply():
    """
    Creates a temporary testing directory inside an approved directory,
    creates sample test files, scans dry-run plan, verifies collision handling,
    and applies selected changes safely.
    """
    approved_roots = client.get("/api/health").json()["approved_directories"]
    assert len(approved_roots) > 0
    test_root = Path(approved_roots[0])
    test_root.mkdir(parents=True, exist_ok=True)

    with tempfile.TemporaryDirectory(dir=test_root) as tmp_dir_str:
        tmp_dir = Path(tmp_dir_str)
        # Create test files
        doc1 = tmp_dir / "invoice_march_2026.pdf"
        doc1.write_text("dummy invoice content")
        img1 = tmp_dir / "IMG_20260401_001.jpg"
        img1.write_text("dummy image content")
        code1 = tmp_dir / "script_backup.py"
        code1.write_text("print('hello')")

        # 1. Test Dry Run Scan
        scan_res = client.post("/api/files/scan", json={"directory_path": str(tmp_dir), "use_ai_naming": False})
        assert scan_res.status_code == 200
        scan_data = scan_res.json()
        assert scan_data["total_files_scanned"] == 3
        
        # Verify plans categorize properly
        categories = {p["category"] for p in scan_data["plans"]}
        assert "Documents" in categories
        assert "Images" in categories
        assert "Code" in categories

        # Verify no files were moved yet (dry-run guarantee)
        assert doc1.exists()
        assert img1.exists()
        assert code1.exists()

        # 2. Select only doc1 and img1 to move
        doc_plan = next(p for p in scan_data["plans"] if p["original_name"] == "invoice_march_2026.pdf")
        img_plan = next(p for p in scan_data["plans"] if p["original_name"] == "IMG_20260401_001.jpg")

        apply_payload = {
            "directory_path": str(tmp_dir),
            "operations": [
                {
                    "id": doc_plan["id"],
                    "original_rel_path": doc_plan["original_rel_path"],
                    "proposed_rel_path": doc_plan["proposed_rel_path"]
                },
                {
                    "id": img_plan["id"],
                    "original_rel_path": img_plan["original_rel_path"],
                    "proposed_rel_path": img_plan["proposed_rel_path"]
                }
            ]
        }

        apply_res = client.post("/api/files/apply", json=apply_payload)
        assert apply_res.status_code == 200
        apply_data = apply_res.json()
        assert apply_data["successful_count"] == 2
        assert apply_data["failed_count"] == 0

        # Verify confirmed files were safely moved into category subdirectories
        assert (tmp_dir / doc_plan["proposed_rel_path"]).exists()
        assert (tmp_dir / img_plan["proposed_rel_path"]).exists()
        # Verify unselected file was NOT touched
        assert code1.exists()

def test_file_organizer_prevent_destination_overwrite():
    """Verify that moving a file to an existing destination is safely skipped/rejected without data loss."""
    approved_roots = client.get("/api/health").json()["approved_directories"]
    test_root = Path(approved_roots[0])

    with tempfile.TemporaryDirectory(dir=test_root) as tmp_dir_str:
        tmp_dir = Path(tmp_dir_str)
        src = tmp_dir / "source.txt"
        src.write_text("original content")
        
        dest_dir = tmp_dir / "Documents"
        dest_dir.mkdir(parents=True, exist_ok=True)
        dest = dest_dir / "source.txt"
        dest.write_text("pre-existing content that must not be overwritten")

        apply_payload = {
            "directory_path": str(tmp_dir),
            "operations": [
                {
                    "id": "op-test-overwrite",
                    "original_rel_path": "source.txt",
                    "proposed_rel_path": "Documents/source.txt"
                }
            ]
        }

        apply_res = client.post("/api/files/apply", json=apply_payload)
        assert apply_res.status_code == 200
        res = apply_res.json()["results"][0]
        assert res["status"] == "skipped"
        assert "Overwrite prohibited" in res["detail"]
        # Assert pre-existing destination is intact
        assert dest.read_text() == "pre-existing content that must not be overwritten"
        # Assert source was not deleted
        assert src.exists()


# 4. Activity History & Safe Undo Tests
def test_history_creation_and_filters():
    """Verify that operations write to SQLite history and can be filtered by type and status."""
    # 1. Trigger task organization
    client.post("/api/tasks/organize", json={"raw_text": "buy groceries; urgent bug fix", "force_demo": True})
    
    # 2. Trigger notes summarization
    client.post("/api/notes/summarize", json={"raw_notes": "Project review notes. Team is on track.", "force_demo": True})

    # Query all history
    res = client.get("/api/history")
    assert res.status_code == 200
    records = res.json()["records"]
    assert len(records) >= 2

    # Query with type filter
    res_tasks = client.get("/api/history?operation_type=tasks_organize")
    assert res_tasks.status_code == 200
    assert all(r["operation_type"] == "tasks_organize" for r in res_tasks.json()["records"])

    # Query with status filter
    res_status = client.get("/api/history?status=success")
    assert res_status.status_code == 200
    assert all(r["status"] == "success" for r in res_status.json()["records"])

def test_history_clear_safety():
    """Verify clearing history removes database records but does NOT touch filesystem files."""
    # Ensure there are records
    client.post("/api/tasks/organize", json={"raw_text": "sample task for history clear test", "force_demo": True})
    
    # Clear specific or all
    clear_res = client.post("/api/history/clear", json={})
    assert clear_res.status_code == 200
    assert clear_res.json()["cleared_count"] >= 1

    # Verify history is now empty
    check_res = client.get("/api/history")
    assert len(check_res.json()["records"]) == 0

def test_file_operations_safe_undo():
    """
    Verify full safe undo flow:
    1. Move file into category directory.
    2. Retrieve history record with can_undo = True.
    3. Trigger undo endpoint: verifies destination is available and rolls file back to original location.
    4. Verify record can_undo is updated so it cannot be undone twice.
    """
    approved_roots = client.get("/api/health").json()["approved_directories"]
    test_root = Path(approved_roots[0])

    with tempfile.TemporaryDirectory(dir=test_root) as tmp_dir_str:
        tmp_dir = Path(tmp_dir_str)
        test_file = tmp_dir / "draft_memo.docx"
        test_file.write_text("important memo draft")

        # Apply move to Documents/Draft Memo.docx
        apply_payload = {
            "directory_path": str(tmp_dir),
            "operations": [
                {
                    "id": "op-undo-test",
                    "original_rel_path": "draft_memo.docx",
                    "proposed_rel_path": "Documents/Draft Memo.docx"
                }
            ]
        }
        apply_res = client.post("/api/files/apply", json=apply_payload)
        assert apply_res.status_code == 200
        assert (tmp_dir / "Documents/Draft Memo.docx").exists()
        assert not test_file.exists()

        # Find history entry for this operation
        hist_res = client.get("/api/history?operation_type=files_apply")
        records = hist_res.json()["records"]
        assert len(records) > 0
        apply_record = records[0]
        assert apply_record["can_undo"] is True

        # Trigger Undo
        undo_res = client.post(f"/api/history/{apply_record['id']}/undo")
        assert undo_res.status_code == 200
        undo_data = undo_res.json()
        assert undo_data["status"] == "success"

        # Verify file is back at original path
        assert test_file.exists()
        assert test_file.read_text() == "important memo draft"
        assert not (tmp_dir / "Documents/Draft Memo.docx").exists()

        # Verify second undo attempt is rejected (cannot undo twice)
        undo_again_res = client.post(f"/api/history/{apply_record['id']}/undo")
        assert undo_again_res.status_code == 400
