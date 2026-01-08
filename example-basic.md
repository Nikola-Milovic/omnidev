# Example Capability: `tasks` (basic)

This is a concrete, minimal example of a built-in **Tasks & Plan Management** capability, aligned with the idea that:

- `capability.toml` is the source of truth for configuration (and optional MCP config).
- `definition.md` contains **base docs and description**, not configuration.

---

## On-disk layout

```
OMNI_DIR/  # default: .omni/
  capabilities/
    tasks/
      capability.toml
      definition.md
      tools/
        task_manager.py
      docs/
        usage.md
      skills/
        task-management/
          SKILL.md
```

---

## `capability.toml`

This is the config OmniDev loads to register the capability. Everything else is discovered from the filesystem.

```toml
[capability]
id = "tasks"
name = "Tasks"
version = "0.1.0"
description = "Basic task + plan management for OmniDev agents."

[exports]
# Namespace to inject into the sandbox (`import tasks`).
# Optional; defaults to a sanitized capability id.
python_module = "tasks"
```

Notes:
- The exact TOML schema is up to your loader; the goal is to keep *all config here*.
- A capability can include an optional `[mcp]` table when it wraps an external MCP server.
- By default, OmniDev discovers:
  - `tools/**/*.py` as injected code under the capability namespace
  - `definition.md` + `docs/**` as searchable docs/snippets for `omni_query`
  - `skills/*/SKILL.md` as Agent Skills

---

## `definition.md`

This is what a human reads. Keep it clean Markdown. Treat it as the “landing page” for the capability.

```md
# Tasks capability

Provides task and plan management primitives inside the sandbox.

## What it’s for

- Track work items during a session
- Maintain an explicit execution plan
- Reduce agent thrash by making progress visible

## API (Python)

- tasks.create(title, description=None, tags=None) -> id
- tasks.list(status=None) -> list[task]
- tasks.get(id) -> task
- tasks.update(id, **fields) -> task
- tasks.complete(id) -> task
- tasks.plan_get() -> list[plan_item]
- tasks.plan_set(items) -> list[plan_item]
```

---

## `tools/task_manager.py` (skeleton)

This is a minimal shape for how the sandbox library could look. The persistence mechanism is intentionally simple for MVP.

```python
from __future__ import annotations

from dataclasses import dataclass, asdict
from pathlib import Path
import json
import time
from typing import Any, Literal

Status = Literal["todo", "in_progress", "blocked", "done"]

import os

OMNI_DIR = Path(os.environ.get("OMNI_DIR", ".omni"))
STATE_DIR = OMNI_DIR / "state"
TASKS_FILE = STATE_DIR / "tasks.json"
PLAN_FILE = STATE_DIR / "plan.json"

@dataclass
class Task:
  id: str
  title: str
  description: str | None
  status: Status
  tags: list[str]
  created_at: float
  updated_at: float

def _load_json(path: Path, default: Any) -> Any:
  if not path.exists():
    return default
  return json.loads(path.read_text(encoding="utf-8"))

def _save_json(path: Path, data: Any) -> None:
  STATE_DIR.mkdir(parents=True, exist_ok=True)
  path.write_text(json.dumps(data, indent=2, sort_keys=True), encoding="utf-8")

def create(title: str, description: str | None = None, tags: list[str] | None = None) -> str:
  now = time.time()
  tasks = _load_json(TASKS_FILE, {})
  task_id = f"task_{int(now * 1000)}"
  task = Task(
    id=task_id,
    title=title,
    description=description,
    status="todo",
    tags=tags or [],
    created_at=now,
    updated_at=now,
  )
  tasks[task_id] = asdict(task)
  _save_json(TASKS_FILE, tasks)
  return task_id

def list(status: Status | None = None) -> list[dict[str, Any]]:
  tasks = _load_json(TASKS_FILE, {})
  values = list(tasks.values())
  if status is None:
    return values
  return [t for t in values if t.get("status") == status]

def get(task_id: str) -> dict[str, Any]:
  tasks = _load_json(TASKS_FILE, {})
  if task_id not in tasks:
    raise KeyError(f"Unknown task: {task_id}")
  return tasks[task_id]

def update(task_id: str, **fields: Any) -> dict[str, Any]:
  tasks = _load_json(TASKS_FILE, {})
  if task_id not in tasks:
    raise KeyError(f"Unknown task: {task_id}")
  task = tasks[task_id]
  task.update(fields)
  task["updated_at"] = time.time()
  tasks[task_id] = task
  _save_json(TASKS_FILE, tasks)
  return task

def complete(task_id: str) -> dict[str, Any]:
  return update(task_id, status="done")

def plan_get() -> list[dict[str, Any]]:
  return _load_json(PLAN_FILE, [])

def plan_set(items: list[dict[str, Any]]) -> list[dict[str, Any]]:
  _save_json(PLAN_FILE, items)
  return items
```

---

## `skills/task-management/SKILL.md` (example)

Skills follow the Agent Skills spec: a directory with a `SKILL.md` containing YAML frontmatter + Markdown body.

```md
---
name: task-management
description: Maintain an explicit plan and update tasks as work progresses. Use for multi-step work and when tracking progress matters.
---

## Tasks & plan rules

- Maintain an explicit plan before executing multi-step work.
- Keep exactly one plan step `in_progress` at a time.
- When you finish a meaningful unit of work, update the plan before continuing.
- If blocked, mark the step `blocked` and state what you need.
```
