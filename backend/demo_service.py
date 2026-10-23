import re
import uuid
from typing import List, Tuple
from schemas import OrganizedTask

def parse_local_demo_tasks(raw_text: str) -> List[OrganizedTask]:
    """
    Deterministic rule-based task organizer that runs locally without any AI model.
    Clearly labeled in responses as 'local_demo'. Does not invent tasks.
    """
    raw_lines = [line.strip() for line in raw_text.splitlines() if line.strip()]
    extracted_items = []
    
    for line in raw_lines:
        parts = [p.strip() for p in line.split(";") if p.strip()]
        for part in parts:
            cleaned = re.sub(r"^(\s*[-*•]|\s*\[[\s xX]?\]|\s*\d+[\.\)])\s*", "", part).strip()
            if cleaned and len(cleaned) > 1:
                extracted_items.append(cleaned)

    if not extracted_items:
        extracted_items = [raw_text.strip()]

    tasks: List[OrganizedTask] = []
    
    high_priority_words = {"urgent", "asap", "today", "emergency", "fix", "critical", "deadline", "pay", "submit"}
    low_priority_words = {"someday", "later", "read", "explore", "consider", "browse", "maybe", "eventually"}
    
    category_map = {
        "work": {"bug", "deploy", "pr", "review", "client", "meeting", "code", "sprint", "email", "backend", "frontend", "api"},
        "finance": {"pay", "bill", "invoice", "bank", "tax", "rent", "subscription", "expense"},
        "health": {"doctor", "dentist", "gym", "workout", "medicine", "pill", "run", "water", "sleep"},
        "shopping": {"buy", "groceries", "milk", "eggs", "order", "store", "market", "hardware"},
        "personal": {"call", "clean", "wash", "mom", "dad", "book", "trip", "car", "room"}
    }

    for idx, item in enumerate(extracted_items, start=1):
        item_lower = item.lower()
        
        if any(w in item_lower for w in high_priority_words):
            priority = "High"
            est_duration = "15-30 mins"
        elif any(w in item_lower for w in low_priority_words):
            priority = "Low"
            est_duration = "45-60 mins"
        else:
            priority = "Medium"
            est_duration = "30 mins"

        category = "General"
        for cat_name, keywords in category_map.items():
            if any(k in item_lower for k in keywords):
                category = cat_name.capitalize()
                break

        tasks.append(
            OrganizedTask(
                id=f"demo-task-{uuid.uuid4().hex[:8]}",
                title=item,
                category=category,
                priority=priority,
                estimated_duration=est_duration,
                suggested_order=idx,
                completed=False
            )
        )

    priority_order = {"High": 1, "Medium": 2, "Low": 3}
    tasks.sort(key=lambda t: priority_order[t.priority])
    
    for idx, task in enumerate(tasks, start=1):
        task.suggested_order = idx

    return tasks

def parse_local_demo_notes(raw_notes: str) -> Tuple[str, List[str], List[str]]:
    """
    Deterministic rule-based notes processor that extracts summary, key points,
    and action items locally without any AI model. Does not log contents.
    """
    lines = [line.strip() for line in raw_notes.splitlines() if line.strip()]
    
    # 1. Action Items detection
    action_keywords = {"todo", "action", "need to", "must", "follow-up", "follow up", "assign", "deliver", "deadline", "prepare", "send", "review"}
    action_items = []
    
    for line in lines:
        cleaned = re.sub(r"^(\s*[-*•]|\s*\[[\s xX]?\]|\s*\d+[\.\)])\s*", "", line).strip()
        lower_line = cleaned.lower()
        if any(kw in lower_line for kw in action_keywords):
            if cleaned not in action_items:
                action_items.append(cleaned)

    # 2. Key Points (Take informative sentences or bullet points)
    key_points = []
    for line in lines:
        cleaned = re.sub(r"^(\s*[-*•]|\s*\[[\s xX]?\]|\s*\d+[\.\)])\s*", "", line).strip()
        if cleaned and cleaned not in action_items:
            # Prefer points that provide information
            if len(cleaned) > 20 and cleaned not in key_points:
                key_points.append(cleaned)
        if len(key_points) >= 5:
            break

    if not key_points and lines:
        key_points = [re.sub(r"^(\s*[-*•]|\s*\[[\s xX]?\]|\s*\d+[\.\)])\s*", "", l).strip() for l in lines[:3]]

    # 3. Summary (Extract overview narrative from first few sentences or lines)
    if len(lines) == 1:
        summary = lines[0]
    else:
        # Take up to the first 2-3 prominent lines as concise distillation
        overview_lines = [l for l in lines[:3] if not l.startswith("#")]
        summary = " ".join(overview_lines)
        if len(summary) > 300:
            summary = summary[:297] + "..."

    return summary, key_points, action_items
