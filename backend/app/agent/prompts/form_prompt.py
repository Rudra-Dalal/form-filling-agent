import json
from typing import Any, Dict

def build_initial_task_prompt(instruction: str, target_url: str, document_data: Any) -> str:
    doc_json = document_data.model_dump() if hasattr(document_data, "model_dump") else document_data
    return f"""Instruction: {instruction}

Target URL: {target_url}

Document data (JSON):
{json.dumps(doc_json, indent=2)}"""
