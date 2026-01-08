# OmniDev Product Specification

> **Status**: MVP Draft v0.5
> **Last Updated**: 2026-01-07

## Vision

OmniDev is a meta-MCP that eliminates context bloat by exposing only **2 tools** to the LLM while providing access to unlimited power through a sandboxed coding environment. **Capabilities** are the fundamental building blocks—plugins that add MCPs, custom functionality, documentation, or workflows—all exposed as callable functions in the sandbox.

**The Core Insight**: Most agents use MCP by directly exposing "tools" to the LLM. We do something different: we convert MCP tools (and everything else) into a **programmable API** (Python/TypeScript), and ask the LLM to write code that calls that API.

> *Reference: Inspired by Cloudflare's "Code Mode". LLMs are often better at writing code to call tools than calling tools directly. This approach allows stringing together multiple calls, looping, and logic without round-trips.*

---

## Table of Contents

1. [Core Concepts](#core-concepts)
2. [Architecture Overview](#architecture-overview)
3. [The Two MCP Tools](#the-two-mcp-tools)
4. [Capabilities System](#capabilities-system)
5. [Sandbox Environment](#sandbox-environment)
6. [Git Safety Layer](#git-safety-layer)
7. [Directory Structure](#directory-structure)
8. [Configuration System](#configuration-system)
9. [Profiles System](#profiles-system)
10. [Task & Plan Management](#task--plan-management)
11. [CLI Interface](#cli-interface)
12. [Demo Scenarios](#demo-scenarios)
13. [Technical Notes](#technical-notes)
14. [Future Features](#future-features)

---

## Core Concepts

### The Problem

1.  **Context Bloat**: Loading 10 MCPs = 100+ tool definitions in context.
2.  **Inefficient Execution**: Traditional agents need a round-trip for every tool call.
3.  **Rigid Tooling**: Tools are static; they don't adapt to project phases (planning vs. coding).
4.  **Unsafe File Access**: LLMs can make destructive changes without safety nets.

### The Solution: "Everything is a Capability"

OmniDev wraps every piece of functionality into a **Capability**.

*   **MCPs → Code**: An AWS MCP becomes `aws.*` functions in the sandbox.
*   **Workflows → Code**: Task management becomes `tasks.*` functions.
*   **Docs → Code**: Guidelines become searchable/readable context.

The LLM interacts with the world via **Code**, not JSON tool calls.

```
┌─────────────────────────────────────────────────────────────────┐
│                      Traditional MCP Approach                    │
│                                                                  │
│   LLM Context: [tool1, tool2, tool3, ... tool50]                │
│                        ↓                                         │
│   Action: Call tool1 → Wait → Result → Call tool2 → Wait...     │
│                                                                  │
│                  SLOW, BLOATED, FRAGILE                         │
│└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                      OmniDev Approach                            │
│                                                                  │
│   LLM Context: [omni_query, omni_execute]                       │
│                        ↓                                         │
│   Action: Write Script                                          │
│           ├── result1 = tool1()                                 │
│           ├── if result1: tool2(result1)                        │
│           └── return final_result                               │
│                                                                  │
│                  FAST, PROGRAMMATIC, POWERFUL                   │
│└─────────────────────────────────────────────────────────────────┘
```

### Core Requirements Summary

1.  **Flexible Task Management**: "Tasks" are just a capability. Users can swap the default task system for a custom Jira or Trello capability.
2.  **Doc-Driven Development**: Capabilities can ingest documentation (e.g., "Code Guidelines") and expose them to the LLM to enforce standards.
3.  **MCP-to-Code Conversion**: Any MCP server is automatically converted into a sandboxed library (`server.action()`).
4.  **Layered Configuration**: Supports teams. A team lead shares a minimal config (repo access, linting rules), and individual developers layer their own tools (debugging, personal notes) on top.

### Naming & Paths

This spec uses a few path constants to keep things configurable:

*   **`OMNI_DIR`**: The per-project OmniDev directory (default: `.omni/` at the repo root). Configurable via CLI flag (e.g., `--omni-dir`) or environment variable.
*   **`OMNI_HOME`**: The user/global OmniDev directory (default: `~/.omni/`).

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        LLM / AI Agent                           │
│                                                                  │
│   Only sees 2 tools:                                            │
│   • omni_query - Search capabilities & snippets                │
│   • omni_execute - Run code with full project access            │
│└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                       OmniDev Server                            │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                 Capabilities Registry                     │   │
│  │  • Directories in OMNI_DIR/capabilities/                 │   │
│  │  • Composed of code, docs, skills, and MCP config        │   │
│  └──────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │             Execution Environment ("Sandbox")            │   │
│  │  • Runtime: Python (primary), TypeScript (future)        │   │
│  │  • Modules: Auto-generated from active Capabilities      │   │
│  │  • Access: Read/Write to repo (default)                  │   │
│  └──────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                   Git Safety Layer                        │   │
│  │  • Auto-commit / Rollback                                │   │
│  └──────────────────────────────────────────────────────────┘   │
│└─────────────────────────────────────────────────────────────────┘
```

---

## The Two MCP Tools

OmniDev exposes exactly **two** tools to the LLM. Everything else (MCP tools, workflows, docs) becomes code inside the execution environment.

### Tool 1: `omni_query`

Discovery + search without dumping tons of context.

**Uses (MVP):**
*   Search across active capabilities, docs, and skills without dumping full content into context
*   Return short snippets (optionally tagged as capability/doc/skill)
*   If `query` is empty, return a compact summary of what’s currently enabled

**Request shape (MVP):**

```json
{
  "query": "search query",
  "limit": 10
}
```

**Response shape (MVP):**

```text
1) [capability:company-lint] "..."
2) [doc:company-lint] "..."
3) [skill:company-lint] "..."
```

### Tool 2: `omni_execute`

Runs code (initially Python) with the currently active capabilities available as importable modules.

**Request shape (MVP):**

```json
{
  "code": "full contents of main.py"
}
```

**Code format (MVP):**

The LLM should write a complete Python file that OmniDev can execute verbatim:

*   The input `code` is the full contents of `main.py` (not a snippet).
*   Define `def main() -> int:` (return `0` on success).
*   End with `if __name__ == "__main__": raise SystemExit(main())`.
*   Perform side-effectful work inside `main()` so it’s easy to rerun and reason about.

**Execution model (MVP):**

*   OmniDev writes the file to `OMNI_DIR/sandbox/main.py` and executes it with the repo root as the working directory.
*   The active capability Python modules (from `capability.toml` `[exports].python_module`) are importable by name.

**Response shape (MVP):**

```json
{
  "exit_code": 0,
  "stdout": "...",
  "stderr": "",
  "changed_files": ["src/app.py", "README.md"],
  "diff_stat": { "files": 2, "insertions": 10, "deletions": 3 }
}
```

---

## Capabilities System

### Structure of a Capability

A capability is not a rigid "type" but a **composition**. It is defined by a directory in `OMNI_DIR/capabilities/<name>/` containing these core files plus any combination of optional components:

```
OMNI_DIR/capabilities/my-capability/
├── capability.toml     # Capability Configuration (Required)
├── definition.md       # Base Docs & Description (Required)
├── tools/              # Custom Code Injection
│   ├── script.py       # Python functions to inject
│   └── utils.ts        # TypeScript functions (future)
├── docs/               # Knowledge Base
│   ├── guidelines.md   # Text to be indexed
│   └── reference.pdf   # PDFs/other formats
├── skills/             # Agent Instructions
│   └── my-skill/
│       └── SKILL.md    # Agent Skill (YAML frontmatter + Markdown)
```

### Components Detail

1.  **`capability.toml` (Config)**
    *   The source of truth for capability configuration and metadata.
    *   Includes optional `[mcp]` configuration for running an external MCP server (command, args, env, etc.).
    *   **Supervisor Role**: OmniDev handles the lifecycle (start/stop) of configured MCP servers.
    *   **Wrapper**: OmniDev converts MCP tools into callable sandbox functions (e.g., `aws.s3_list_buckets()`).

2.  **`definition.md` (Docs)**
    *   Human-readable base documentation and description.
    *   Used as the default text shown in generic `omni_query` results.
    *   Not used for configuration (keep it as plain Markdown).

3.  **`tools/` (Sandbox Code)**
    *   Contains `.py` (or `.ts`) files.
    *   These are injected into the sandbox and namespaced (e.g., `my_capability.my_function`).
    *   Used for custom logic that doesn't need a full external MCP server.
    *   **MVP convention**: All `tools/**/*.py` files are loaded automatically (no explicit listing required).
    *   **Export rule (MVP)**: Public callables defined in `tools/**/*.py` become attributes on the capability module (e.g., `tools/task_manager.py` exporting `create()` becomes `tasks.create()`), and collisions fail fast.

4.  **`docs/` (Knowledge)**
    *   Markdown or text files that provide context.
    *   Indexed by OmniDev for RAG-like querying via `omni_query`.
    *   Example: `code_style.md` tells the LLM how to write code in this project.
    *   **MVP convention**: Index `definition.md` plus all files in `docs/` by default.

5.  **`skills/` (Prompts)**
    *   Defines "skills" or "behaviors" for the agent in a standard, portable format.
    *   **MVP convention**: A skill is a directory `skills/<skill-name>/` containing `SKILL.md`.
    *   `SKILL.md` must contain YAML frontmatter with at least `name` and `description`, followed by Markdown instructions.
    *   The skill `name` must match the parent directory name (e.g., `skills/task-management/SKILL.md` must have `name: task-management`).
    *   The skill `name` is the identifier/export used for discovery and activation.
    *   Skills are discoverable via `omni_query` as snippet results (e.g., `[skill:task-management] "...")`.
    *   **Naming constraints (Agent Skills spec)**:
        *   `name`: 1–64 chars, lowercase letters/numbers/hyphens, no leading/trailing hyphen, no consecutive hyphens; must match directory name.
        *   `description`: 1–1024 chars; describe what it does and when to use it.
    *   **Optional skill directories**: `scripts/`, `references/`, `assets/` (loaded on demand).
    *   **Progressive disclosure**: load only `name`/`description` metadata up-front; load full `SKILL.md` body only when the skill is activated.

### `capability.toml` (MVP Schema)

**Required:**
*   `[capability]`: `id`, `name`, `version`, `description`

**Common optional tables:**
*   `[exports]`: `python_module` (defaults to a sanitized `capability.id`, e.g., `company-lint` → `company_lint`)
*   `[mcp]` (optional): wraps an external MCP server and exposes its tools as functions
    *   `command`, `args`, `env`, `cwd`, `transport` (e.g., `stdio`)
    *   If both `tools/` and `[mcp]` are present, they share the same exported module; name collisions should fail fast.

**Filesystem discovery (MVP):**
*   `tools/` is loaded automatically (all `tools/**/*.py`).
*   `docs/` is indexed automatically (plus `definition.md`).
*   `skills/` is discovered automatically (`skills/*/SKILL.md`).

Example MCP-based capability:

```toml
[capability]
id = "aws"
name = "AWS"
version = "0.1.0"
description = "AWS operations via MCP."

[exports]
python_module = "aws"

[mcp]
command = "npx"
args = ["-y", "@modelcontextprotocol/server-aws"]
transport = "stdio"
```

### Installation & Management

*   **Manual**: Drop a folder into `OMNI_DIR/capabilities/`.
*   **Hub (Future)**: `omnidev install <capability>` downloads from a registry.
*   **Composition**: A user can mix and match. A "DevOps" capability might contain `kubectl` MCP (via `capability.toml`) AND a custom python script to parse logs (`tools/parser.py`) AND documentation on deployment policy (`docs/deploy.md`).

---

## Sandbox Environment

### Implementation

The "sandbox" is best thought of as a **local playground / VM**, not a hard security boundary. Users add capabilities on their own machine and accept the risk.

*   **MVP target**: Fast local execution that can import capability modules and run scripts.
*   **Isolation (optional)**: Container/WASM/etc can be added later for teams that want stricter boundaries.
*   **Language Support**: Initially Python (rich scripting ecosystem), but architected to support TypeScript (Node/Deno) later.
*   **Repo + network access**: Default to full access (this is a developer tool), with optional guardrails rather than strict sandboxing.
    *   *Optional: Read-Only* - Useful for analysis-only sessions.

### Code Mode Execution

Instead of single tool calls, the sandbox executes scripts:

```python
# The LLM writes this whole block:
import aws
import filesystem

# 1. Get data
config = filesystem.read_json("config.prod.json")

# 2. Logic & Transformation
bucket_name = f"backup-{config['id']}"

# 3. Execution
if not aws.s3_exists(bucket_name):
    aws.s3_create(bucket_name)
    print(f"Created {bucket_name}")
```

---

## Git Safety Layer

This is a safety net for accidental changes and fast iteration. It is not a security boundary.

*   **Checkpointing**: Create a baseline checkpoint before running a mutation-heavy `omni_execute` (commit, stash, or patch-based snapshot).
*   **Change summaries**: `omni_execute` should return a concise summary (changed files + diff stats) to keep the agent honest.
*   **Rollback**: Provide a one-command rollback to the last checkpoint for “oops” recovery.
*   **Policy hooks (optional)**: Teams can add lint/test gates or “confirm destructive ops” rules as capabilities (not hardcoded).

---

## Directory Structure

```
project-root/
├── .omni/                              # OMNI_DIR (default)
│   ├── config.toml                     # Shared project configuration
│   ├── config.local.toml               # Local overrides (gitignored)
│   ├── capabilities/                   # THE CAPABILITY REGISTRY
│   │   ├── tasks/                      # A built-in capability
│   │   │   ├── capability.toml
│   │   │   ├── definition.md
│   │   │   ├── tools/
│   │   │   │   └── task_manager.py
│   │   │   ├── docs/
│   │   │   └── skills/
│   │   │       └── task-management/
│   │   │           └── SKILL.md
│   │   ├── aws/                        # An MCP-based capability
│   │   │   ├── capability.toml          # Includes [mcp] config (e.g., "npx -y @modelcontextprotocol/server-aws...")
│   │   │   ├── definition.md
│   │   └── my-custom-tool/
│   │       ├── capability.toml
│   │       ├── definition.md
│   │       └── tools/
│   │           └── script.py
│   ├── profiles/                       # Optional: split profile definitions
│   ├── state/                          # Local runtime state (tasks, cache, etc.)
│   └── sandbox/                        # Execution scratch (optional)
└── .gitignore
```

---

## Configuration System

### Layered Configuration (Team Support)

OmniDev supports a hierarchical configuration model.

1.  **Global (User)**: `OMNI_HOME/config.toml`
    *   *User preferences, secrets, and defaults.*
2.  **Team (Project Shared)**: `OMNI_DIR/config.toml` (Git-tracked)
    *   *Shared capabilities and project defaults.*
3.  **Local (Project Private)**: `OMNI_DIR/config.local.toml` (Git-ignored)
    *   *Developer overrides for a specific checkout.*

### Precedence & Merge Rules (MVP)

*   **Precedence**: `OMNI_DIR/config.local.toml` → `OMNI_DIR/config.toml` → `OMNI_HOME/config.toml` (last writer wins).
*   **Tables**: Deep-merge by key.
*   **Scalars**: Override.
*   **Capability enable/disable**: Union across layers (final enabled = enable − disable).

### Configuration Files

The configuration points to where capabilities live and which ones are enabled. TOML is used everywhere.

```toml
# OMNI_DIR/config.toml
project = "backend-api"
default_profile = "coding"

[paths]
# By default, capabilities live in OMNI_DIR/capabilities/.
# The value can be absolute, repo-relative, or OMNI_DIR-relative (implementation choice).
capabilities = "capabilities"

[capabilities]
# Union across config layers; final enabled = enable - disable.
enable = ["tasks", "git", "company-lint"]
disable = []

[profiles.planning]
enable = ["tasks", "research"]
disable = ["git", "company-lint"]

[profiles.coding]
enable = ["git", "company-lint"]
disable = ["tasks", "research"]
```

---

## Profiles System

Profiles are named presets for *which capabilities are active right now* (and optionally, which skill files get loaded).

*   **Why**: Planning, research, and coding benefit from different tools and different “agent posture”.
*   **Where**: Define profiles inline in `OMNI_DIR/config.toml` (`[profiles.<name>]`) and/or as separate TOML files in `OMNI_DIR/profiles/`.
*   **Selection**: Choose an active profile via CLI (`--profile coding`) or by the calling client.
*   **Default**: If no profile is selected, run with the base `capabilities.enable/disable` only (or a configured default profile).
*   **Resolution**: Start from base `capabilities.enable/disable`, then apply the profile’s `enable/disable`.

---

## Task & Plan Management

### Tasks as a Capability

The Task system is **not hardcoded**. It is a default capability (`builtin/tasks` or `OMNI_DIR/capabilities/tasks`) that provides:
1.  **Schema**: Defines what a task looks like (title, status, validators).
2.  **Functions**: `tasks.list()`, `tasks.complete()`, `tasks.validate()`.
3.  **Context**: Injects prompt instructions on how to manage the plan.

For a concrete minimal implementation, see `example-basic.md`.

If a user wants to use GitHub Issues instead:
1.  Disable the `tasks` capability.
2.  Enable a `github-issues` capability.
3.  The sandbox now has `github.issues.create()` instead of `tasks.create()`, and the LLM adapts via the new capability's docs.

---

## CLI Interface

The CLI is primarily for running OmniDev as an MCP server and managing project configuration.

*   `omnidev init` - Create `OMNI_DIR/` with a starter `config.toml`.
*   `omnidev serve` - Start the MCP server that exposes `omni_query` and `omni_execute`.
    *   Key flags: `--omni-dir <path>`, `--profile <name>`.
*   `omnidev capability list|enable|disable` - Manage active capabilities for a project.
*   `omnidev profile list|set` - Inspect and switch profiles.
*   `omnidev doctor` - Validate runtime dependencies and configuration.

---

## Demo Scenarios

1.  **Plan → Execute loop (no context bloat)**
    *   Enable `tasks` and `git` capabilities.
    *   Use the `planning` profile to create a plan and tasks.
    *   Switch to `coding` profile, implement, run tests, and checkpoint/rollback as needed.

2.  **Wrap an MCP server as a capability**
    *   Create `OMNI_DIR/capabilities/aws/capability.toml` with an `[mcp]` block.
    *   OmniDev supervises the MCP process and exposes tools as `aws.*` functions in the sandbox.

3.  **Docs + skills steer behavior**
    *   Add `docs/` and `skills/` to a capability (e.g., `company-lint`) to enforce conventions without hardcoding rules in OmniDev.

---

## Technical Notes

*   **Not a security boundary**: The “sandbox” is trusted local execution; guardrails are UX features (git checkpoints, confirmations, lint/test hooks).
*   **Capability loading**: Discover `OMNI_DIR/capabilities/*/capability.toml`, register exports, and inject tools/docs/skills.
*   **MCP bridging**: When `[mcp]` is present, spawn/supervise the server and generate callable wrappers from the tool schemas.
*   **Indexing**: `definition.md` + `docs/` should be searchable via `omni_query` without dumping full documents into context.

---

## Future Features

*   **TypeScript Sandbox**: Native support for TS execution (Deno/Node).
*   **Remote Sandboxes**: Execute code in a cloud container for heavy workloads.
*   **Capability Hub**: `omnidev install user/capability`.
