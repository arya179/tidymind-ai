import json
import logging
import os
import re
import uuid
import requests
from dotenv import load_dotenv
from typing import List, Optional, Tuple, Dict, Any
from schemas import OrganizedTask

# Load environment variables from .env
load_dotenv()

logger = logging.getLogger(__name__)

def get_ollama_base_url() -> str:
    url = os.getenv("OLLAMA_BASE_URL", "http://127.0.0.1:11434").rstrip("/")
    return url

def get_configured_model() -> str:
    return os.getenv("OLLAMA_MODEL", "gemma:2b").strip()

def get_timeout_seconds() -> int:
    try:
        return int(os.getenv("OLLAMA_TIMEOUT_SECONDS", "60"))
    except ValueError:
        return 60

def check_ollama_health() -> Dict[str, Any]:
    """
    Checks whether Ollama is reachable and whether the configured model is installed.
    Zero data is sent to any external server.
    """
    base_url = get_ollama_base_url()
    configured_model = get_configured_model()
    
    try:
        resp = requests.get(f"{base_url}/api/tags", timeout=3)
        if resp.status_code == 200:
            data = resp.json()
            models = [m.get("name") for m in data.get("models", []) if m.get("name")]
            model_match = any(
                m == configured_model or m.startswith(f"{configured_model}:") 
                for m in models
            )
            return {
                "reachable": True,
                "configured_model": configured_model,
                "model_available": model_match,
                "installed_models": models
            }
    except Exception as e:
        logger.warning(f"Ollama health check failed: {e}")

    return {
        "reachable": False,
        "configured_model": configured_model,
        "model_available": False,
        "installed_models": []
    }

def organize_tasks_with_ollama(
    raw_text: str, 
    requested_model: Optional[str] = None
) -> Tuple[List[OrganizedTask], str]:
    """
    Invokes local Ollama inference using strict JSON output mode.
    Never calls external or cloud APIs. Validates and enforces schema strictly.
    """
    health = check_ollama_health()
    if not health["reachable"]:
        raise ConnectionError(f"Ollama server is unreachable at {get_ollama_base_url()}. Please ensure 'ollama serve' is active.")

    available_models = health["installed_models"]
    if not available_models:
        raise ValueError("Ollama is reachable, but no models are currently installed locally.")

    model_to_use = requested_model if (requested_model and requested_model in available_models) else None
    if not model_to_use:
        # Match configured model
        cfg = health["configured_model"]
        matched = [m for m in available_models if m == cfg or m.startswith(f"{cfg}:")]
        if matched:
            model_to_use = matched[0]
        else:
            model_to_use = available_models[0]

    system_prompt = (
        "You are an expert personal productivity assistant running entirely locally.\n"
        "Your task: organize and prioritize the user's messy tasks strictly without inventing new tasks.\n"
        "INSTRUCTIONS:\n"
        "1. Only include items from the user's input.\n"
        "2. Categorize each task (e.g. Work, Personal, Health, Finance, Shopping, Urgent).\n"
        "3. Assign a sensible priority ('High', 'Medium', or 'Low').\n"
        "4. Estimate duration (e.g. '15 mins', '45 mins') ONLY when reasonable to infer; otherwise set to null.\n"
        "5. Assign 'suggested_order' as an achievable integer starting at 1.\n"
        "6. Return ONLY a single raw JSON object matching this schema:\n"
        "{\n"
        "  \"tasks\": [\n"
        "    {\n"
        "      \"title\": string,\n"
        "      \"category\": string,\n"
        "      \"priority\": \"High\" | \"Medium\" | \"Low\",\n"
        "      \"estimated_duration\": string | null,\n"
        "      \"suggested_order\": integer\n"
        "    }\n"
        "  ]\n"
        "}\n"
        "Do NOT return markdown or explanation. Just valid JSON."
    )

    user_prompt = f"Tasks to organize:\n{raw_text}"

    payload = {
        "model": model_to_use,
        "system": system_prompt,
        "prompt": user_prompt,
        "stream": False,
        "format": "json",
        "options": {
            "temperature": 0.1,
            "top_p": 0.9,
        }
    }

    base_url = get_ollama_base_url()
    timeout_secs = get_timeout_seconds()

    try:
        response = requests.post(
            f"{base_url}/api/generate",
            json=payload,
            timeout=timeout_secs
        )
        response.raise_for_status()
        res_json = response.json()
        raw_output = res_json.get("response", "").strip()
    except requests.exceptions.Timeout:
        raise TimeoutError(f"Ollama inference timed out after {timeout_secs} seconds.")
    except requests.exceptions.RequestException as e:
        raise ConnectionError(f"Failed to communicate with Ollama: {str(e)}")

    if not raw_output:
        raise ValueError("Ollama returned an empty response.")

    # Strip codeblock wrappers if any
    clean_json = raw_output
    if "```" in clean_json:
        clean_json = re.sub(r"^```(?:json)?\s*", "", clean_json)
        clean_json = re.sub(r"\s*```$", "", clean_json)

    try:
        parsed = json.loads(clean_json)
    except Exception as e:
        logger.error(f"Failed to parse JSON from {model_to_use}: {raw_output}")
        raise ValueError(f"Ollama output was not valid JSON: {str(e)}")

    tasks_raw = parsed.get("tasks", [])
    if not isinstance(tasks_raw, list) or len(tasks_raw) == 0:
        raise ValueError("Model JSON response did not contain a non-empty 'tasks' list.")

    tasks: List[OrganizedTask] = []
    valid_priorities = {"High", "Medium", "Low"}

    for idx, item in enumerate(tasks_raw, start=1):
        if not isinstance(item, dict):
            continue
        title = str(item.get("title", "")).strip()
        if not title:
            continue
        category = str(item.get("category", "General")).strip().capitalize() or "General"
        
        priority_raw = str(item.get("priority", "Medium")).strip().capitalize()
        priority = priority_raw if priority_raw in valid_priorities else "Medium"
        
        duration = item.get("estimated_duration")
        if duration is not None:
            duration = str(duration).strip()
            if not duration or duration.lower() == "none" or duration.lower() == "null":
                duration = None

        suggested_order = item.get("suggested_order")
        if not isinstance(suggested_order, int) or suggested_order < 1:
            suggested_order = idx

        tasks.append(
            OrganizedTask(
                id=f"ai-task-{uuid.uuid4().hex[:8]}",
                title=title,
                category=category,
                priority=priority,
                estimated_duration=duration,
                suggested_order=suggested_order,
                completed=False
            )
        )

    if not tasks:
        raise ValueError("No valid structured task items were extracted from the model output.")

    # Sort in ascending suggested order
    tasks.sort(key=lambda t: t.suggested_order)
    return tasks, model_to_use

def summarize_notes_with_ollama(
    raw_notes: str,
    requested_model: Optional[str] = None
) -> Tuple[str, List[str], List[str], str]:
    """
    Summarizes notes into summary, key_points, and action_items via local Ollama inference.
    Does NOT log the content of the notes to preserve privacy.
    """
    health = check_ollama_health()
    if not health["reachable"]:
        raise ConnectionError(f"Ollama server is unreachable at {get_ollama_base_url()}.")

    available_models = health["installed_models"]
    if not available_models:
        raise ValueError("Ollama is reachable, but no models are currently installed locally.")

    model_to_use = requested_model if (requested_model and requested_model in available_models) else None
    if not model_to_use:
        cfg = health["configured_model"]
        matched = [m for m in available_models if m == cfg or m.startswith(f"{cfg}:")]
        if matched:
            model_to_use = matched[0]
        else:
            model_to_use = available_models[0]

    system_prompt = (
        "You are an expert executive note summarizer running locally.\n"
        "Analyze the provided text and produce a concise distillation.\n"
        "INSTRUCTIONS:\n"
        "1. 'summary': A clear, high-level narrative summary of what the notes discuss.\n"
        "2. 'key_points': An array of strings containing the most critical facts, decisions, or principles.\n"
        "3. 'action_items': An array of strings containing explicit or implied follow-up tasks, assignments, and to-dos.\n"
        "4. Return ONLY a single raw JSON object matching this schema:\n"
        "{\n"
        "  \"summary\": string,\n"
        "  \"key_points\": [string],\n"
        "  \"action_items\": [string]\n"
        "}\n"
        "Do NOT return markdown or explanation. Just valid JSON."
    )

    user_prompt = f"Notes to summarize:\n{raw_notes}"

    payload = {
        "model": model_to_use,
        "system": system_prompt,
        "prompt": user_prompt,
        "stream": False,
        "format": "json",
        "options": {
            "temperature": 0.2,
            "top_p": 0.9,
        }
    }

    base_url = get_ollama_base_url()
    timeout_secs = get_timeout_seconds()

    try:
        response = requests.post(
            f"{base_url}/api/generate",
            json=payload,
            timeout=timeout_secs
        )
        response.raise_for_status()
        res_json = response.json()
        raw_output = res_json.get("response", "").strip()
    except requests.exceptions.Timeout:
        raise TimeoutError(f"Ollama inference timed out after {timeout_secs} seconds.")
    except requests.exceptions.RequestException as e:
        raise ConnectionError(f"Failed to communicate with Ollama: {str(e)}")

    if not raw_output:
        raise ValueError("Ollama returned an empty response.")

    clean_json = raw_output
    if "```" in clean_json:
        clean_json = re.sub(r"^```(?:json)?\s*", "", clean_json)
        clean_json = re.sub(r"\s*```$", "", clean_json)

    try:
        parsed = json.loads(clean_json)
    except Exception as e:
        # Avoid logging raw note content for privacy
        logger.error(f"Failed to parse JSON response from {model_to_use}")
        raise ValueError(f"Ollama output was not valid JSON: {str(e)}")

    summary = str(parsed.get("summary", "")).strip()
    if not summary:
        raise ValueError("Model output missing 'summary' field.")

    key_points_raw = parsed.get("key_points", [])
    key_points = [str(k).strip() for k in key_points_raw if str(k).strip()] if isinstance(key_points_raw, list) else []

    action_items_raw = parsed.get("action_items", [])
    action_items = [str(a).strip() for a in action_items_raw if str(a).strip()] if isinstance(action_items_raw, list) else []

    return summary, key_points, action_items, model_to_use

def suggest_file_names_with_ollama(
    file_names: List[str],
    requested_model: Optional[str] = None
) -> Dict[str, str]:
    """
    Sends file names (NEVER file contents) to local Ollama to propose cleaner,
    descriptive filenames. Returns a dictionary mapping original_name -> proposed_name.
    """
    if not file_names:
        return {}

    health = check_ollama_health()
    if not health["reachable"] or not health["installed_models"]:
        return {}

    model_to_use = requested_model if (requested_model and requested_model in health["installed_models"]) else health["installed_models"][0]

    system_prompt = (
        "You are a local file naming assistant.\n"
        "Given a list of filenames, propose cleaner, human-readable, and well-cased filenames.\n"
        "RULES:\n"
        "1. PRESERVE THE EXACT ORIGINAL FILE EXTENSION (e.g. .pdf, .jpg, .txt).\n"
        "2. Do not invent files that were not in the input.\n"
        "3. Output ONLY a valid JSON object mapping original filename to proposed filename:\n"
        "{\n"
        "  \"suggestions\": {\n"
        "    \"original_name.ext\": \"Cleaned Proposed Name.ext\"\n"
        "  }\n"
        "}"
    )

    names_list = "\n".join(f"- {name}" for name in file_names[:25])
    user_prompt = f"Propose clean filenames for these files:\n{names_list}"

    payload = {
        "model": model_to_use,
        "system": system_prompt,
        "prompt": user_prompt,
        "stream": False,
        "format": "json",
        "options": {
            "temperature": 0.1,
            "top_p": 0.9,
        }
    }

    try:
        response = requests.post(
            f"{get_ollama_base_url()}/api/generate",
            json=payload,
            timeout=15
        )
        if response.status_code == 200:
            data = response.json()
            raw_output = data.get("response", "").strip()
            if "```" in raw_output:
                raw_output = re.sub(r"^```(?:json)?\s*", "", raw_output)
                raw_output = re.sub(r"\s*```$", "", raw_output)
            parsed = json.loads(raw_output)
            suggestions = parsed.get("suggestions", {})
            if isinstance(suggestions, dict):
                return suggestions
    except Exception as e:
        logger.warning(f"AI file naming suggestion skipped: {e}")

    return {}
