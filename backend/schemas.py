from typing import List, Optional, Literal, Dict, Any
from pydantic import BaseModel, Field

# --- Task Schemas ---
class OrganizeTasksRequest(BaseModel):
    raw_text: str = Field(..., min_length=1, max_length=20000, description="Raw unstructured task text entered by the user")
    force_demo: bool = Field(False, description="Explicitly trigger local-demo mode instead of calling Ollama")
    model: Optional[str] = Field(None, description="Optional specific Ollama model name to target; defaults to OLLAMA_MODEL")

class OrganizedTask(BaseModel):
    id: str = Field(..., description="Unique task identifier")
    title: str = Field(..., min_length=1, description="Concise, actionable task description")
    category: str = Field("General", description="Grouping category (e.g., Work, Health, Personal, Errand, Project)")
    priority: Literal["High", "Medium", "Low"] = Field("Medium", description="Task urgency and impact level")
    estimated_duration: Optional[str] = Field(None, description="Estimated time to complete only when reasonable")
    suggested_order: int = Field(1, ge=1, description="Recommended achievable sequence order")
    completed: bool = Field(False, description="Task completion status")

class OrganizeTasksResponse(BaseModel):
    tasks: List[OrganizedTask] = Field(default_factory=list)
    source: Literal["local_ai", "local_demo"] = Field(..., description="Whether response was produced by Ollama or deterministic local demo parser")
    model_used: Optional[str] = Field(None, description="Model identifier if produced by Ollama")
    message: str = Field(..., description="Status message detailing how tasks were organized")
    warning: Optional[str] = Field(None, description="Helpful warning if Ollama was unreachable, timed out, or fell back")


# --- Notes Summarizer Schemas ---
MAX_NOTE_LENGTH = 30000  # ~6,000 words limit to protect local context limits

class SummarizeNotesRequest(BaseModel):
    raw_notes: str = Field(..., min_length=1, max_length=MAX_NOTE_LENGTH, description="Raw notes text to summarize")
    force_demo: bool = Field(False, description="Explicitly trigger local-demo mode instead of calling Ollama")
    model: Optional[str] = Field(None, description="Optional specific Ollama model name to target; defaults to OLLAMA_MODEL")

class SummarizeNotesResponse(BaseModel):
    summary: str = Field(..., description="High-level narrative distillation of the notes")
    key_points: List[str] = Field(default_factory=list, description="Extracted core principles, decisions, or facts")
    action_items: List[str] = Field(default_factory=list, description="Extracted follow-up tasks, assignments, and to-dos")
    source: Literal["local_ai", "local_demo"] = Field(..., description="Whether response was produced by local Ollama or rule-based demo parser")
    model_used: Optional[str] = Field(None, description="Model identifier if produced by Ollama")
    message: str = Field(..., description="Status message detailing how notes were processed")
    warning: Optional[str] = Field(None, description="Helpful warning if Ollama was unreachable or fell back")


# --- File Organizer Schemas ---
class FilePlanItem(BaseModel):
    id: str = Field(..., description="Unique operation identifier")
    original_rel_path: str = Field(..., description="Current relative path of the file")
    proposed_rel_path: str = Field(..., description="Proposed organized relative path")
    original_name: str
    proposed_name: str
    extension: str
    size_bytes: int
    size_formatted: str
    category: str = Field(..., description="Categorization (e.g., Documents, Images, Code, Audio, Video, Archives)")
    reason: str = Field(..., description="Clear rationale explaining the proposed change")
    suggested_by: Literal["rules", "ai_suggestions"] = Field("rules", description="Source of the recommendation")

class ScanDirectoryRequest(BaseModel):
    directory_path: str = Field(..., min_length=1, description="Path to scan within approved directories")
    use_ai_naming: bool = Field(False, description="Optionally invoke local Ollama to propose cleaner descriptive filenames")

class ScanDirectoryResponse(BaseModel):
    base_directory: str
    total_files_scanned: int
    plans: List[FilePlanItem] = Field(default_factory=list)
    approved_directories: List[str] = Field(default_factory=list)
    warning: Optional[str] = None
    message: str

class ApplyFileOperation(BaseModel):
    id: str
    original_rel_path: str
    proposed_rel_path: str

class ApplyFileOperationsRequest(BaseModel):
    directory_path: str = Field(..., min_length=1, description="Target base directory")
    operations: List[ApplyFileOperation] = Field(..., min_length=1, description="Explicitly selected operations to execute")

class FileOperationResult(BaseModel):
    id: str
    original_rel_path: str
    proposed_rel_path: str
    status: Literal["success", "skipped", "error"]
    detail: str

class ApplyFileOperationsResponse(BaseModel):
    total_requested: int
    successful_count: int
    failed_count: int
    results: List[FileOperationResult]
    message: str


# --- Activity History Schemas ---
class ActivityRecord(BaseModel):
    id: str = Field(..., description="Unique record identifier")
    timestamp: str = Field(..., description="ISO 8601 formatted timestamp")
    operation_type: Literal["tasks_organize", "notes_summarize", "files_scan", "files_apply", "files_undo"] = Field(..., description="Type of operation performed")
    status: Literal["success", "warning", "error"] = Field("success", description="Outcome status")
    title: str = Field(..., description="Short operation title")
    description: str = Field(..., description="Non-sensitive operational summary")
    source: Literal["local_ai", "local_demo", "rules", "system"] = Field("rules")
    can_undo: bool = Field(False, description="Whether this operation is eligible for safe rollback")
    metadata: Optional[Dict[str, Any]] = Field(default=None, description="Safe metadata for rollback (paths, hashes)")

class HistoryListResponse(BaseModel):
    records: List[ActivityRecord] = Field(default_factory=list)
    total: int = 0

class ClearHistoryRequest(BaseModel):
    record_ids: Optional[List[str]] = Field(default=None, description="Specific record IDs to clear; if None or empty, clears all")

class ClearHistoryResponse(BaseModel):
    cleared_count: int
    message: str

class UndoOperationResponse(BaseModel):
    record_id: str
    status: Literal["success", "error"]
    detail: str
    message: str


# --- System / Health Schemas ---
class BackendHealthResponse(BaseModel):
    status: Literal["healthy", "degraded", "unhealthy"]
    backend_status: str
    ollama_base_url: str
    ollama_reachable: bool
    configured_model: str
    model_available: bool
    installed_models: List[str]
    mode: Literal["full_local_ai", "demo_mode_only"]
    approved_directories: List[str] = Field(default_factory=list)
