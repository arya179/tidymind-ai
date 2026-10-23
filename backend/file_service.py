import os
import re
import uuid
import shutil
from pathlib import Path
from typing import List, Dict, Tuple, Optional
from schemas import FilePlanItem, FileOperationResult

# File Categorization Matrix
CATEGORY_EXTENSIONS: Dict[str, List[str]] = {
    "Documents": [".pdf", ".docx", ".doc", ".txt", ".md", ".rtf", ".odt", ".pptx", ".xlsx", ".csv"],
    "Images": [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".bmp", ".tiff", ".heic"],
    "Audio": [".mp3", ".wav", ".flac", ".m4a", ".aac", ".ogg"],
    "Video": [".mp4", ".mov", ".mkv", ".avi", ".webm", ".wmv"],
    "Code": [".py", ".js", ".jsx", ".ts", ".tsx", ".html", ".css", ".json", ".yaml", ".yml", ".sql", ".sh"],
    "Archives": [".zip", ".tar", ".gz", ".7z", ".rar", ".bz2"],
}

def get_approved_directories() -> List[Path]:
    """Retrieve list of resolved approved directories from environment or sensible defaults."""
    env_dirs = os.getenv("APPROVED_DIRECTORIES", "")
    paths: List[Path] = []
    if env_dirs:
        for p in env_dirs.split(","):
            p_strip = p.strip()
            if p_strip:
                paths.append(Path(p_strip).expanduser().resolve())

    # Fallback to current project root's sample workspace
    if not paths:
        project_root = Path(__file__).resolve().parent.parent
        default_dir = project_root / "sample_organizer_workspace"
        paths.append(default_dir.resolve())

    return paths

def validate_and_resolve_directory(requested_path: str) -> Path:
    """
    Validates that the requested directory exists, is a directory,
    and resides strictly within one of the approved directory roots.
    Prevents path traversal attacks (e.g. '../', root access).
    """
    clean_path = requested_path.strip()
    if not clean_path:
        raise ValueError("Directory path cannot be empty.")

    target = Path(clean_path).expanduser().resolve()
    if not target.exists():
        raise FileNotFoundError(f"Directory does not exist: {target}")

    if not target.is_dir():
        raise ValueError(f"Target path is not a directory: {target}")

    # Security: check if target is inside an approved directory
    approved_roots = get_approved_directories()
    is_allowed = False
    for approved in approved_roots:
        try:
            target.relative_to(approved)
            is_allowed = True
            break
        except ValueError:
            # Target is not relative to this approved root
            continue

    if not is_allowed:
        approved_display = ", ".join(str(p) for p in approved_roots)
        raise PermissionError(
            f"Path '{target}' is not within any approved directory. Approved roots: [{approved_display}]"
        )

    return target

def format_size(bytes_num: int) -> str:
    """Formats file size into human-readable representation."""
    for unit in ['B', 'KB', 'MB', 'GB', 'TB']:
        if bytes_num < 1024.0:
            return f"{bytes_num:.1f} {unit}" if unit != 'B' else f"{bytes_num} B"
        bytes_num /= 1024.0
    return f"{bytes_num:.1f} PB"

def categorize_file(filename: str, ext: str) -> Tuple[str, str]:
    """
    Categorizes file into folder and reason based on extension and filename patterns.
    Never inspects file contents.
    """
    ext_lower = ext.lower()
    for cat, extensions in CATEGORY_EXTENSIONS.items():
        if ext_lower in extensions:
            return cat, f"Grouped into '{cat}' by standard file extension ({ext_lower})"

    return "Miscellaneous", "Grouped into 'Miscellaneous' as an uncategorized file extension"

def clean_filename(name: str) -> str:
    """
    Rules-based filename normalization:
    Replaces underscores/hyphens with spaces, removes redundant prefixes, and applies title casing.
    """
    stem = Path(name).stem
    ext = Path(name).suffix

    # Standard cleanups: remove leading camera prefixes like IMG_, DSC_, Screenshot_
    cleaned = re.sub(r"^(IMG_|DSC_|Screenshot_|DOC_)", "", stem, flags=re.IGNORECASE)
    cleaned = re.sub(r"[_\-]+", " ", cleaned).strip()
    cleaned = re.sub(r"\s+", " ", cleaned)
    
    # Capitalize words
    if cleaned:
        cleaned = " ".join(word.capitalize() for word in cleaned.split())
    else:
        cleaned = stem

    return f"{cleaned}{ext}"

def scan_and_plan_directory(
    directory: Path, 
    use_ai: bool = False,
    ai_suggestions_map: Optional[Dict[str, str]] = None
) -> List[FilePlanItem]:
    """
    Scans files directly within the directory (non-recursive, no symlink following).
    Creates dry-run proposed destination paths and reasons.
    Ensures no duplicate proposed destinations.
    """
    plans: List[FilePlanItem] = []
    used_destinations: set = set()

    # Iterate over files in the target folder
    for entry in directory.iterdir():
        # Safety: Do NOT follow symlinks, do not process subdirectories
        if entry.is_symlink() or not entry.is_file():
            continue

        original_name = entry.name
        # Skip hidden/system files (e.g. .DS_Store, .gitignore in user media folders)
        if original_name.startswith("."):
            continue

        try:
            stat = entry.stat()
            size_bytes = stat.st_size
        except OSError:
            size_bytes = 0

        ext = entry.suffix
        category, rule_reason = categorize_file(original_name, ext)
        
        # Check if AI suggested a cleaner name or use standard rule cleaning
        proposed_name = original_name
        suggested_by = "rules"
        reason = rule_reason

        if use_ai and ai_suggestions_map and original_name in ai_suggestions_map:
            suggested_name = ai_suggestions_map[original_name]
            if suggested_name and suggested_name.endswith(ext):
                proposed_name = suggested_name
                suggested_by = "ai_suggestions"
                reason = f"Cleaned descriptive name suggested by local AI; filed under '{category}'"
            else:
                proposed_name = clean_filename(original_name)
        else:
            proposed_name = clean_filename(original_name)

        # Proposed relative path inside category folder
        proposed_rel_path = f"{category}/{proposed_name}"

        # Safety: Avoid duplicate destination collisions within the plan
        collision_count = 1
        base_stem = Path(proposed_name).stem
        while proposed_rel_path in used_destinations:
            proposed_name = f"{base_stem} ({collision_count}){ext}"
            proposed_rel_path = f"{category}/{proposed_name}"
            collision_count += 1

        used_destinations.add(proposed_rel_path)

        plans.append(
            FilePlanItem(
                id=f"plan-{uuid.uuid4().hex[:8]}",
                original_rel_path=original_name,
                proposed_rel_path=proposed_rel_path,
                original_name=original_name,
                proposed_name=proposed_name,
                extension=ext if ext else "none",
                size_bytes=size_bytes,
                size_formatted=format_size(size_bytes),
                category=category,
                reason=reason,
                suggested_by=suggested_by
            )
        )

    # Sort plans alphabetically by category, then name
    plans.sort(key=lambda p: (p.category, p.original_name.lower()))
    return plans

def execute_file_operations(
    directory: Path,
    operations: List[Dict[str, str]]
) -> List[FileOperationResult]:
    """
    Executes confirmed file moves/renames with rigorous safety checks:
    - Re-validates that source exists and is not a symlink.
    - Prevents path traversal on source and destination.
    - NEVER overwrites an existing destination file.
    - Creates necessary destination category directories.
    - Never deletes any file.
    """
    results: List[FileOperationResult] = []

    for op in operations:
        op_id = op.get("id", str(uuid.uuid4()))
        orig_rel = op.get("original_rel_path", "").strip()
        prop_rel = op.get("proposed_rel_path", "").strip()

        # 1. Validation checks
        if not orig_rel or not prop_rel:
            results.append(
                FileOperationResult(
                    id=op_id,
                    original_rel_path=orig_rel,
                    proposed_rel_path=prop_rel,
                    status="error",
                    detail="Source or destination path is empty."
                )
            )
            continue

        # Prevent traversal
        source_path = (directory / orig_rel).resolve()
        dest_path = (directory / prop_rel).resolve()

        try:
            source_path.relative_to(directory)
            dest_path.relative_to(directory)
        except ValueError:
            results.append(
                FileOperationResult(
                    id=op_id,
                    original_rel_path=orig_rel,
                    proposed_rel_path=prop_rel,
                    status="error",
                    detail="Security violation: path traversal outside approved base directory."
                )
            )
            continue

        # 2. Check source file validity
        if not source_path.exists():
            results.append(
                FileOperationResult(
                    id=op_id,
                    original_rel_path=orig_rel,
                    proposed_rel_path=prop_rel,
                    status="error",
                    detail="Source file no longer exists."
                )
            )
            continue

        if source_path.is_symlink():
            results.append(
                FileOperationResult(
                    id=op_id,
                    original_rel_path=orig_rel,
                    proposed_rel_path=prop_rel,
                    status="error",
                    detail="Skipped: symbolic links are not moved for security."
                )
            )
            continue

        # 3. Check destination collision
        if dest_path.exists() and dest_path != source_path:
            results.append(
                FileOperationResult(
                    id=op_id,
                    original_rel_path=orig_rel,
                    proposed_rel_path=prop_rel,
                    status="skipped",
                    detail=f"Safety guard: destination '{prop_rel}' already exists. Overwrite prohibited."
                )
            )
            continue

        # 4. If path unchanged, mark as skipped/no-op
        if dest_path == source_path:
            results.append(
                FileOperationResult(
                    id=op_id,
                    original_rel_path=orig_rel,
                    proposed_rel_path=prop_rel,
                    status="skipped",
                    detail="File is already in the proposed location."
                )
            )
            continue

        # 5. Execute move safely
        try:
            dest_path.parent.mkdir(parents=True, exist_ok=True)
            shutil.move(str(source_path), str(dest_path))
            results.append(
                FileOperationResult(
                    id=op_id,
                    original_rel_path=orig_rel,
                    proposed_rel_path=prop_rel,
                    status="success",
                    detail=f"Successfully organized into '{prop_rel}'"
                )
            )
        except Exception as e:
            results.append(
                FileOperationResult(
                    id=op_id,
                    original_rel_path=orig_rel,
                    proposed_rel_path=prop_rel,
                    status="error",
                    detail=f"Filesystem move error: {str(e)}"
                )
            )

    return results

def undo_file_operations(
    directory: Path,
    moved_pairs: List[Dict[str, str]]
) -> Tuple[int, List[str]]:
    """
    Safely rolls back previously moved files:
    moved_pairs is a list of {'from_rel': original_source, 'to_rel': current_moved_destination}.
    Before undoing:
    - Verifies destination is available (i.e. original file path does not collide).
    - Verifies current file exists at 'to_rel' and is not a symlink.
    Returns (undone_count, list of error messages).
    """
    undone_count = 0
    errors = []

    for pair in moved_pairs:
        original_loc = pair.get("from_rel")
        current_loc = pair.get("to_rel")

        if not original_loc or not current_loc:
            continue

        orig_path = (directory / original_loc).resolve()
        curr_path = (directory / current_loc).resolve()

        # Security check
        try:
            orig_path.relative_to(directory)
            curr_path.relative_to(directory)
        except ValueError:
            errors.append(f"Security violation: path traversal prevented for '{current_loc}'")
            continue

        if not curr_path.exists():
            errors.append(f"Cannot undo: file '{current_loc}' was moved or deleted externally.")
            continue

        if curr_path.is_symlink():
            errors.append(f"Cannot undo: file '{current_loc}' is a symlink.")
            continue

        if orig_path.exists() and orig_path != curr_path:
            errors.append(f"Cannot undo: original path '{original_loc}' is already occupied.")
            continue

        try:
            orig_path.parent.mkdir(parents=True, exist_ok=True)
            shutil.move(str(curr_path), str(orig_path))
            undone_count += 1
        except Exception as e:
            errors.append(f"Failed to reverse move for '{current_loc}': {str(e)}")

    return undone_count, errors
