import json
import os
import sqlite3
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Optional, Dict, Any, Tuple
from schemas import ActivityRecord

DB_NAME = "tidymind_history.db"

def get_db_path() -> Path:
    """Returns the persistent SQLite database path located in the backend directory or override."""
    db_env = os.getenv("HISTORY_DB_PATH")
    if db_env:
        return Path(db_env).resolve()
    return Path(__file__).resolve().parent / DB_NAME

def get_connection() -> sqlite3.Connection:
    path = get_db_path()
    conn = sqlite3.connect(str(path))
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """Initializes SQLite database and tables."""
    conn = get_connection()
    with conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS activity_history (
                id TEXT PRIMARY KEY,
                timestamp TEXT NOT NULL,
                operation_type TEXT NOT NULL,
                status TEXT NOT NULL,
                title TEXT NOT NULL,
                description TEXT NOT NULL,
                source TEXT NOT NULL,
                can_undo INTEGER NOT NULL DEFAULT 0,
                metadata TEXT
            );
        """)
        conn.execute("CREATE INDEX IF NOT EXISTS idx_op_type ON activity_history(operation_type);")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_timestamp ON activity_history(timestamp);")
    conn.close()

# Auto-initialize database schema on import
init_db()

def log_activity(
    operation_type: str,
    status: str,
    title: str,
    description: str,
    source: str = "rules",
    can_undo: bool = False,
    metadata: Optional[Dict[str, Any]] = None
) -> str:
    """
    Logs an activity record. Strictly stores operational metadata, counts, and rollback paths.
    NEVER logs full note contents or raw task inputs.
    """
    record_id = f"hist-{uuid.uuid4().hex[:10]}"
    timestamp = datetime.now(timezone.utc).isoformat()
    meta_json = json.dumps(metadata) if metadata else None

    conn = get_connection()
    try:
        with conn:
            conn.execute("""
                INSERT INTO activity_history (
                    id, timestamp, operation_type, status, title, description, source, can_undo, metadata
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                record_id,
                timestamp,
                operation_type,
                status,
                title,
                description,
                source,
                1 if can_undo else 0,
                meta_json
            ))
        return record_id
    finally:
        conn.close()

def list_activities(
    operation_type: Optional[str] = None,
    status: Optional[str] = None
) -> List[ActivityRecord]:
    """Retrieves activities with optional filters, sorted newest first."""
    conn = get_connection()
    try:
        query = "SELECT * FROM activity_history WHERE 1=1"
        params = []
        if operation_type and operation_type != "ALL":
            query += " AND operation_type = ?"
            params.append(operation_type)
        if status and status != "ALL":
            query += " AND status = ?"
            params.append(status)

        query += " ORDER BY timestamp DESC LIMIT 200"

        cursor = conn.cursor()
        cursor.execute(query, params)
        rows = cursor.fetchall()
        
        results: List[ActivityRecord] = []
        for r in rows:
            meta = None
            if r["metadata"]:
                try:
                    meta = json.loads(r["metadata"])
                except Exception:
                    meta = None

            results.append(
                ActivityRecord(
                    id=r["id"],
                    timestamp=r["timestamp"],
                    operation_type=r["operation_type"],
                    status=r["status"],
                    title=r["title"],
                    description=r["description"],
                    source=r["source"],
                    can_undo=bool(r["can_undo"]),
                    metadata=meta
                )
            )
        return results
    finally:
        conn.close()

def get_activity_by_id(record_id: str) -> Optional[ActivityRecord]:
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM activity_history WHERE id = ?", (record_id,))
        r = cursor.fetchone()
        if not r:
            return None
        meta = None
        if r["metadata"]:
            try:
                meta = json.loads(r["metadata"])
            except Exception:
                meta = None
        return ActivityRecord(
            id=r["id"],
            timestamp=r["timestamp"],
            operation_type=r["operation_type"],
            status=r["status"],
            title=r["title"],
            description=r["description"],
            source=r["source"],
            can_undo=bool(r["can_undo"]),
            metadata=meta
        )
    finally:
        conn.close()

def clear_activities(record_ids: Optional[List[str]] = None) -> int:
    """
    Clears specified history entries or all history if record_ids is empty/None.
    Safety rule: NEVER alters, renames, or touches original files on disk.
    """
    conn = get_connection()
    try:
        with conn:
            if record_ids and len(record_ids) > 0:
                placeholders = ",".join("?" for _ in record_ids)
                cursor = conn.execute(f"DELETE FROM activity_history WHERE id IN ({placeholders})", record_ids)
                return cursor.rowcount
            else:
                cursor = conn.execute("DELETE FROM activity_history")
                return cursor.rowcount
    finally:
        conn.close()

def mark_operation_undone(record_id: str):
    """Marks an activity record as can_undo = 0 so it cannot be undone twice."""
    conn = get_connection()
    try:
        with conn:
            conn.execute("UPDATE activity_history SET can_undo = 0 WHERE id = ?", (record_id,))
    finally:
        conn.close()
