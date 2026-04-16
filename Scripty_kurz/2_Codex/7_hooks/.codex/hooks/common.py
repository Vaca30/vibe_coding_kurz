#!/usr/bin/env python3

from __future__ import annotations

import hashlib
import json
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


HOOKS_DIR = Path(__file__).resolve().parent
DEMO_ROOT = HOOKS_DIR.parent.parent
STATE_DIR = DEMO_ROOT / ".codex-hook-state"
AUDIT_LOG = STATE_DIR / "audit-log.jsonl"
SESSION_DIR = STATE_DIR / "sessions"

TEST_COMMAND_RE = re.compile(
    r"\b("
    r"pytest|py\.?test|tox|nox|"
    r"npm\s+(run\s+)?test|pnpm\s+(run\s+)?test|yarn\s+test|vitest|jest|"
    r"cargo\s+test|go\s+test|mix\s+test|rspec|bundle\s+exec\s+rspec|"
    r"phpunit|mvn(\s+\S+)*\s+test|gradle(\w+)?\s+test"
    r")\b",
    re.IGNORECASE,
)

MUTATING_COMMAND_RE = re.compile(
    r"\b("
    r"sed\s+-i|perl\s+-i|mv|cp|rm|mkdir|touch|chmod|chown|patch|git\s+apply|"
    r"npm\s+install|pnpm\s+install|yarn\s+install|pip\s+install|poetry\s+add|"
    r"cargo\s+fmt|ruff\s+format|black\b|prettier\b|go\s+fmt|terraform\s+fmt"
    r")\b",
    re.IGNORECASE,
)

SECRET_PATTERNS: list[tuple[str, re.Pattern[str]]] = [
    ("OpenAI API key", re.compile(r"\bsk-[A-Za-z0-9]{20,}\b")),
    ("GitHub token", re.compile(r"\bgh[pousr]_[A-Za-z0-9]{20,}\b")),
    ("AWS access key", re.compile(r"\bAKIA[0-9A-Z]{16}\b")),
    ("Private key block", re.compile(r"-----BEGIN [A-Z ]+PRIVATE KEY-----")),
]


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def ensure_state_dir() -> None:
    SESSION_DIR.mkdir(parents=True, exist_ok=True)


def read_json(stdin_text: str) -> dict[str, Any]:
    if not stdin_text.strip():
        return {}
    return json.loads(stdin_text)


def load_session_state(session_id: str) -> dict[str, Any]:
    ensure_state_dir()
    session_path = SESSION_DIR / f"{safe_name(session_id)}.json"
    if not session_path.exists():
        return {"session_id": session_id, "turns": {}}
    return json.loads(session_path.read_text())


def save_session_state(session_id: str, state: dict[str, Any]) -> None:
    ensure_state_dir()
    session_path = SESSION_DIR / f"{safe_name(session_id)}.json"
    session_path.write_text(json.dumps(state, indent=2, sort_keys=True) + "\n")


def append_audit_log(record: dict[str, Any]) -> None:
    ensure_state_dir()
    with AUDIT_LOG.open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(record, sort_keys=True) + "\n")


def safe_name(value: str) -> str:
    return re.sub(r"[^A-Za-z0-9._-]+", "_", value)


def command_fingerprint(command: str) -> str:
    return hashlib.sha256(command.encode("utf-8")).hexdigest()


def tool_response_text(tool_response: Any) -> str:
    if isinstance(tool_response, str):
        return tool_response
    try:
        return json.dumps(tool_response, sort_keys=True)
    except TypeError:
        return str(tool_response)


def validation_command(command: str) -> bool:
    return bool(TEST_COMMAND_RE.search(command))


def mutating_command(command: str) -> bool:
    return bool(MUTATING_COMMAND_RE.search(command))


def validation_failed(tool_response: Any) -> bool:
    text = tool_response_text(tool_response)
    lowered = text.lower()

    if re.search(r'"exit_?code"\s*:\s*[1-9][0-9]*', text):
        return True
    if re.search(r'"success"\s*:\s*false', lowered):
        return True
    if any(marker in lowered for marker in (" failed", "failures", "error:", "errors:", "traceback ")):
        return True
    return False


def prompt_secret_matches(prompt: str) -> list[str]:
    matches: list[str] = []
    for label, pattern in SECRET_PATTERNS:
        if pattern.search(prompt):
            matches.append(label)
    return matches
