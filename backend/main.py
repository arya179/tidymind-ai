import logging
import os
from typing import Optional, List, Dict, Any
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from schemas import (
    OrganizeTasksRequest, 
    OrganizeTasksResponse, 
    SummarizeNotesRequest,
    SummarizeNotesResponse,
    MAX_NOTE_LENGTH,
    ScanDirectoryRequest,
    ScanDirectoryResponse,
    ApplyFileOperationsRequest,
    ApplyFileOperationsResponse,
    HistoryListResponse,
    ClearHistoryRequest,
    ClearHistoryResponse,
    UndoOperationResponse,
    BackendHealthResponse
)
from demo_service import parse_local_demo_tasks, parse_local_demo_notes
from ollama_service import (
    check_ollama_health, 
    organize_tasks_with_ollama, 
    summarize_notes_with_ollama,
    suggest_file_names_with_ollama,
    get_ollama_base_url,
    get_configured_model
)
from file_service import (
    get_approved_directories,
    validate_and_resolve_directory,
    scan_and_plan_directory,
    execute_file_operations,
    undo_file_operations
)
from history_service import (
    log_activity,
    list_activities,
    get_activity_by_id,
    clear_activities,
    mark_operation_undone
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("tidymind-backend")

app = FastAPI(
    title="TidyMind AI Backend",
    description="Privacy-focused productivity backend powered by local open-weight AI (Ollama)",
    version="0.3.0",
)

# Enable CORS for local development with Vite frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {
        "name": "TidyMind AI API",
        "status": "online",
        "version": "0.3.0",
        "privacy": "100% Local Inference Guarantee"
    }

@app.get("/api/health", response_model=BackendHealthResponse)
def health_check():
    """
    Comprehensive health endpoint reporting:
    - Backend status
    - Ollama reachability at OLLAMA_BASE_URL
    - Selected OLLAMA_MODEL and its installation status
    - Local models list
    - Approved directory roots
    """
    ollama_info = check_ollama_health()
    is_reachable = ollama_info["reachable"]
    is_model_avail = ollama_info["model_available"]

    overall_status = "healthy" if (is_reachable and is_model_avail) else ("degraded" if is_reachable else "unhealthy")
    mode = "full_local_ai" if (is_reachable and is_model_avail) else "demo_mode_only"
    approved_dirs = [str(d) for d in get_approved_directories()]

    return BackendHealthResponse(
        status=overall_status,
        backend_status="online",
        ollama_base_url=get_ollama_base_url(),
        ollama_reachable=is_reachable,
        configured_model=get_configured_model(),
        model_available=is_model_avail,
        installed_models=ollama_info["installed_models"],
        mode=mode,
        approved_directories=approved_dirs
    )

@app.post("/api/tasks/organize", response_model=OrganizeTasksResponse)
def organize_tasks_endpoint(payload: OrganizeTasksRequest):
    """
    Organizes messy task text into categorized, prioritized, and ordered task items.
    If force_demo is requested or Ollama is unavailable, cleanly falls back to local-demo mode
    with honest metadata labeling. Never transmits user data to any external service.
    """
    raw_text = payload.raw_text.strip()
    if not raw_text:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Task input text cannot be empty."
        )

    # 1. User explicitly requested local demo mode
    if payload.force_demo:
        demo_tasks = parse_local_demo_tasks(raw_text)
        log_activity(
            operation_type="tasks_organize",
            status="success",
            title=f"Organized {len(demo_tasks)} task(s)",
            description=f"Generated {len(demo_tasks)} categorized task items via Local Demo Mode.",
            source="local_demo"
        )
        return OrganizeTasksResponse(
            tasks=demo_tasks,
            source="local_demo",
            model_used=None,
            message="Organized using Local Demo Mode (Rule-based heuristic, no AI model invoked)."
        )

    # 2. Attempt organization via local Ollama
    try:
        tasks, model_used = organize_tasks_with_ollama(
            raw_text=raw_text, 
            requested_model=payload.model
        )
        log_activity(
            operation_type="tasks_organize",
            status="success",
            title=f"Organized {len(tasks)} task(s) with local AI",
            description=f"Structured {len(tasks)} task items using local model '{model_used}'.",
            source="local_ai"
        )
        return OrganizeTasksResponse(
            tasks=tasks,
            source="local_ai",
            model_used=model_used,
            message=f"Successfully organized with local open-weight model: {model_used}."
        )
    except TimeoutError as time_err:
        logger.warning(f"Ollama inference timeout: {time_err}. Falling back to demo mode.")
        demo_tasks = parse_local_demo_tasks(raw_text)
        log_activity(
            operation_type="tasks_organize",
            status="warning",
            title=f"Organized {len(demo_tasks)} task(s) (Timeout Fallback)",
            description="Inference timed out; processed via deterministic Local Demo fallback.",
            source="local_demo"
        )
        return OrganizeTasksResponse(
            tasks=demo_tasks,
            source="local_demo",
            model_used=None,
            message="Local inference timed out. Falling back to Local Demo Mode.",
            warning=str(time_err)
        )
    except ConnectionError as conn_err:
        logger.warning(f"Ollama connection error: {conn_err}. Falling back to demo mode.")
        demo_tasks = parse_local_demo_tasks(raw_text)
        log_activity(
            operation_type="tasks_organize",
            status="warning",
            title=f"Organized {len(demo_tasks)} task(s) (Offline Fallback)",
            description="Ollama unreachable; processed via deterministic Local Demo fallback.",
            source="local_demo"
        )
        return OrganizeTasksResponse(
            tasks=demo_tasks,
            source="local_demo",
            model_used=None,
            message="Ollama model is currently unreachable. Organized using Local Demo Mode.",
            warning=str(conn_err)
        )
    except ValueError as val_err:
        logger.error(f"Ollama returned invalid structure: {val_err}. Falling back to demo mode.")
        demo_tasks = parse_local_demo_tasks(raw_text)
        log_activity(
            operation_type="tasks_organize",
            status="warning",
            title=f"Organized {len(demo_tasks)} task(s) (Parse Fallback)",
            description="Model output was malformed; processed via Local Demo fallback.",
            source="local_demo"
        )
        return OrganizeTasksResponse(
            tasks=demo_tasks,
            source="local_demo",
            model_used=None,
            message="Local model returned non-standard output. Processed via Local Demo Mode fallback.",
            warning=f"Model parsing note: {str(val_err)}"
        )
    except Exception as exc:
        logger.error(f"Unexpected error organizing tasks: {exc}")
        demo_tasks = parse_local_demo_tasks(raw_text)
        log_activity(
            operation_type="tasks_organize",
            status="warning",
            title=f"Organized {len(demo_tasks)} task(s) (Fallback)",
            description=f"Internal fallback: {str(exc)}",
            source="local_demo"
        )
        return OrganizeTasksResponse(
            tasks=demo_tasks,
            source="local_demo",
            model_used=None,
            message="Internal processing fallback: organized via Local Demo Mode.",
            warning=str(exc)
        )

@app.post("/api/notes/summarize", response_model=SummarizeNotesResponse)
def summarize_notes_endpoint(payload: SummarizeNotesRequest):
    """
    Summarizes long notes into executive summary, key points, and action items.
    Enforces privacy by not logging raw notes content.
    Provides clear, labeled local demo mode fallback if Ollama is unreachable.
    """
    raw_notes = payload.raw_notes.strip()
    if not raw_notes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Note content cannot be empty."
        )

    if len(raw_notes) > MAX_NOTE_LENGTH:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Note exceeds maximum supported character length ({MAX_NOTE_LENGTH} characters)."
        )

    # 1. User explicitly requested demo mode
    if payload.force_demo:
        summary, key_points, action_items = parse_local_demo_notes(raw_notes)
        log_activity(
            operation_type="notes_summarize",
            status="success",
            title="Summarized Notes (Demo)",
            description=f"Distilled notes into {len(key_points)} key point(s) and {len(action_items)} action item(s) via Local Demo Mode.",
            source="local_demo"
        )
        return SummarizeNotesResponse(
            summary=summary,
            key_points=key_points,
            action_items=action_items,
            source="local_demo",
            model_used=None,
            message="Summarized using Local Demo Mode (Rule-based heuristic, no AI model invoked)."
        )

    # 2. Attempt local Ollama summarization
    try:
        summary, key_points, action_items, model_used = summarize_notes_with_ollama(
            raw_notes=raw_notes,
            requested_model=payload.model
        )
        log_activity(
            operation_type="notes_summarize",
            status="success",
            title=f"Summarized Notes ({model_used})",
            description=f"Distilled notes into {len(key_points)} key point(s) and {len(action_items)} action item(s) using local model.",
            source="local_ai"
        )
        return SummarizeNotesResponse(
            summary=summary,
            key_points=key_points,
            action_items=action_items,
            source="local_ai",
            model_used=model_used,
            message=f"Successfully summarized with local open-weight model: {model_used}."
        )
    except TimeoutError as time_err:
        logger.warning(f"Ollama inference timeout during summarization. Falling back to demo mode.")
        summary, key_points, action_items = parse_local_demo_notes(raw_notes)
        log_activity(
            operation_type="notes_summarize",
            status="warning",
            title="Summarized Notes (Timeout Fallback)",
            description="Inference timed out; processed via Local Demo Mode fallback.",
            source="local_demo"
        )
        return SummarizeNotesResponse(
            summary=summary,
            key_points=key_points,
            action_items=action_items,
            source="local_demo",
            model_used=None,
            message="Local inference timed out. Processed via Local Demo Mode fallback.",
            warning=str(time_err)
        )
    except ConnectionError as conn_err:
        logger.warning(f"Ollama connection error during summarization: {conn_err}. Falling back to demo mode.")
        summary, key_points, action_items = parse_local_demo_notes(raw_notes)
        log_activity(
            operation_type="notes_summarize",
            status="warning",
            title="Summarized Notes (Offline Fallback)",
            description="Ollama unreachable; processed via Local Demo Mode fallback.",
            source="local_demo"
        )
        return SummarizeNotesResponse(
            summary=summary,
            key_points=key_points,
            action_items=action_items,
            source="local_demo",
            model_used=None,
            message="Ollama model is currently unreachable. Summarized using Local Demo Mode.",
            warning=str(conn_err)
        )
    except ValueError as val_err:
        logger.error(f"Ollama returned invalid summarization structure: {val_err}. Falling back to demo mode.")
        summary, key_points, action_items = parse_local_demo_notes(raw_notes)
        log_activity(
            operation_type="notes_summarize",
            status="warning",
            title="Summarized Notes (Parse Fallback)",
            description="Malformed AI output; processed via Local Demo Mode fallback.",
            source="local_demo"
        )
        return SummarizeNotesResponse(
            summary=summary,
            key_points=key_points,
            action_items=action_items,
            source="local_demo",
            model_used=None,
            message="Local model returned non-standard output. Processed via Local Demo Mode fallback.",
            warning=f"Model parsing note: {str(val_err)}"
        )
    except Exception as exc:
        summary, key_points, action_items = parse_local_demo_notes(raw_notes)
        log_activity(
            operation_type="notes_summarize",
            status="warning",
            title="Summarized Notes (Fallback)",
            description=f"Internal processing fallback: {str(exc)}",
            source="local_demo"
        )
        return SummarizeNotesResponse(
            summary=summary,
            key_points=key_points,
            action_items=action_items,
            source="local_demo",
            model_used=None,
            message="Internal processing fallback: summarized via Local Demo Mode.",
            warning=str(exc)
        )

# --- File Organizer Endpoints ---
@app.post("/api/files/scan", response_model=ScanDirectoryResponse)
def scan_directory_endpoint(payload: ScanDirectoryRequest):
    """
    Safely scans a directory within approved roots without modifying or deleting anything.
    Produces a dry-run plan categorized by extension with optional AI name cleaning.
    """
    try:
        resolved_dir = validate_and_resolve_directory(payload.directory_path)
    except PermissionError as perm_err:
        log_activity(
            operation_type="files_scan",
            status="error",
            title="File Scan Denied",
            description=f"Directory access outside approved roots rejected.",
            source="system"
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(perm_err)
        )
    except (FileNotFoundError, ValueError) as err:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(err)
        )

    approved_dirs = [str(d) for d in get_approved_directories()]

    ai_suggestions_map = None
    warning = None
    if payload.use_ai_naming:
        try:
            sample_names = [e.name for e in resolved_dir.iterdir() if e.is_file() and not e.name.startswith(".")]
            ai_suggestions_map = suggest_file_names_with_ollama(sample_names[:30])
        except Exception as e:
            warning = f"AI filename suggestions unavailable: {str(e)}. Defaulted to rule-based names."

    plans = scan_and_plan_directory(
        directory=resolved_dir,
        use_ai=payload.use_ai_naming,
        ai_suggestions_map=ai_suggestions_map
    )

    log_activity(
        operation_type="files_scan",
        status="success",
        title=f"Scanned {len(plans)} file(s)",
        description=f"Generated dry-run organization plan for directory '{resolved_dir.name}'.",
        source="rules"
    )

    return ScanDirectoryResponse(
        base_directory=str(resolved_dir),
        total_files_scanned=len(plans),
        plans=plans,
        approved_directories=approved_dirs,
        warning=warning,
        message=f"Dry run generated for {len(plans)} files. No changes have been applied."
    )

@app.post("/api/files/apply", response_model=ApplyFileOperationsResponse)
def apply_file_operations_endpoint(payload: ApplyFileOperationsRequest):
    """
    Applies only explicitly user-selected file operations.
    Validates safety on every item: prevents traversal, prevents overwriting existing files,
    never deletes files, never follows symlinks.
    Logs successful moves with safe rollback metadata for undo.
    """
    try:
        resolved_dir = validate_and_resolve_directory(payload.directory_path)
    except PermissionError as perm_err:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(perm_err)
        )
    except (FileNotFoundError, ValueError) as err:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(err)
        )

    ops_dicts = [op.model_dump() for op in payload.operations]
    results = execute_file_operations(directory=resolved_dir, operations=ops_dicts)

    success_count = sum(1 for r in results if r.status == "success")
    failed_count = sum(1 for r in results if r.status == "error")

    # Record moved pairs for safe undo capability
    successful_pairs = [
        {"from_rel": op["original_rel_path"], "to_rel": op["proposed_rel_path"]}
        for op in ops_dicts
        if any(r.original_rel_path == op["original_rel_path"] and r.status == "success" for r in results)
    ]

    log_activity(
        operation_type="files_apply",
        status="success" if failed_count == 0 else "warning",
        title=f"Applied {success_count} file change(s)",
        description=f"Moved {success_count} file(s) into category folders in '{resolved_dir.name}'.",
        source="rules",
        can_undo=(success_count > 0),
        metadata={
            "directory_path": str(resolved_dir),
            "moved_pairs": successful_pairs
        } if successful_pairs else None
    )

    return ApplyFileOperationsResponse(
        total_requested=len(payload.operations),
        successful_count=success_count,
        failed_count=failed_count,
        results=results,
        message=f"Applied {success_count} operation(s) safely. {failed_count} error(s)."
    )

# --- Activity History Endpoints ---
@app.get("/api/history", response_model=HistoryListResponse)
def get_history_endpoint(operation_type: Optional[str] = None, status: Optional[str] = None):
    """Retrieves recorded activity history with optional type/status filters."""
    records = list_activities(operation_type=operation_type, status=status)
    return HistoryListResponse(records=records, total=len(records))

@app.post("/api/history/clear", response_model=ClearHistoryResponse)
def clear_history_endpoint(payload: ClearHistoryRequest):
    """
    Clears specified or all activity history records after user confirmation.
    CRITICAL: Does NOT delete or alter any user files on disk.
    """
    cleared = clear_activities(record_ids=payload.record_ids)
    return ClearHistoryResponse(
        cleared_count=cleared,
        message=f"Cleared {cleared} activity record(s) from persistent history."
    )

@app.post("/api/history/{record_id}/undo", response_model=UndoOperationResponse)
def undo_history_endpoint(record_id: str):
    """
    Safely undos a reversible file operation.
    Validates destination availability and ensures no file data is lost or overwritten.
    """
    record = get_activity_by_id(record_id)
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="History record not found.")

    if not record.can_undo or not record.metadata:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="This operation cannot be undone or has already been reversed."
        )

    dir_path_str = record.metadata.get("directory_path")
    moved_pairs = record.metadata.get("moved_pairs", [])

    if not dir_path_str or not moved_pairs:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing rollback metadata.")

    try:
        resolved_dir = validate_and_resolve_directory(dir_path_str)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Cannot access directory: {str(e)}")

    undone_count, errors = undo_file_operations(directory=resolved_dir, moved_pairs=moved_pairs)

    # Mark as undone so it cannot be undone twice
    mark_operation_undone(record_id)

    log_activity(
        operation_type="files_undo",
        status="success" if not errors else "warning",
        title=f"Reversed {undone_count} file move(s)",
        description=f"Safely restored {undone_count} file(s) back to their original locations in '{resolved_dir.name}'.",
        source="system",
        can_undo=False
    )

    detail_msg = f"Restored {undone_count} file(s)."
    if errors:
        detail_msg += f" Warnings: {'; '.join(errors)}"

    return UndoOperationResponse(
        record_id=record_id,
        status="success" if undone_count > 0 else "error",
        detail=detail_msg,
        message=f"Undo completed: {undone_count} of {len(moved_pairs)} file(s) reversed."
    )
