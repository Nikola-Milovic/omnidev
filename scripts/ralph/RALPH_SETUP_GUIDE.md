# Ralph - AI Agent Orchestrator Setup Guide

**Complete setup guide for porting Ralph to any project**

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [File Structure](#file-structure)
4. [Installation](#installation)
5. [Complete Code](#complete-code)
6. [Workflow](#workflow)
7. [Usage Examples](#usage-examples)
8. [Best Practices](#best-practices)

---

## Overview

**Ralph** is a long-running AI agent orchestrator for PRD-driven development. It executes complex features through iterative AI agent invocations, working through user stories one at a time until all acceptance criteria are met.

### Key Features

- **PRD-driven**: Structured JSON orchestration files link to detailed task documents
- **Iterative execution**: Works on one user story per iteration
- **Progress tracking**: Maintains logs with learnings and codebase patterns
- **Multi-agent support**: Works with `amp`, `codex`, or `claude` agents
- **Automatic archiving**: Archives previous runs when switching branches
- **Quality gates**: Enforces typecheck, lint, and format checks before commits

### Why Ralph?

- ✅ Breaks complex features into manageable chunks
- ✅ Maintains context across iterations with progress logs
- ✅ Extracts and documents codebase patterns automatically
- ✅ Ensures consistent code quality with automated checks
- ✅ Provides clear audit trail of what was implemented when

---

## Architecture

Ralph consists of three main components:

### 1. **The Orchestrator** (`ralph.sh`)
Bash script that:
- Reads `prd.json` to find incomplete user stories
- Invokes AI agents with the prompt template
- Tracks progress across iterations
- Archives runs when switching branches

### 2. **Skills**
Two Cursor Composer skills guide the workflow:

#### `prd` Skill
Creates detailed Product Requirements Documents:
- Asks clarifying questions
- Generates structured PRDs with user stories
- Saves to `tasks/prd-XXX-feature-name.md`

#### `ralph` Skill
Creates orchestration files (`prd.json`):
- Links user stories to detailed task files
- Defines scope for each story
- Sets execution order and priorities

### 3. **The Agent Prompt** (`prompt.md`)
Instructions for the AI agent on each iteration:
- Read PRD and progress log
- Check out correct branch
- Implement highest priority incomplete story
- Run quality checks
- Commit changes
- Update PRD and progress log

---

## File Structure

```
your-project/
├── scripts/
│   └── ralph/
│       ├── ralph.sh              # Main orchestrator script
│       ├── prompt.md             # Agent instructions template
│       ├── prd.json              # Current orchestration file
│       ├── prd.example.json      # Example/template
│       ├── progress.txt          # Progress log with learnings
│       ├── .last-branch          # Tracks current branch for archiving
│       └── archive/              # Archived runs by date + branch
│           └── 2026-01-08-admin-meal-planner/
│               ├── prd.json
│               └── progress.txt
├── .agent/
│   └── skills/
│       ├── prd/
│       │   └── SKILL.md          # PRD generation skill
│       └── ralph/
│           └── SKILL.md          # Ralph orchestration skill
└── tasks/
    ├── prd-001-feature-a.md      # Detailed task files
    ├── prd-002-feature-b.md
    └── ...
```

---

## Installation

### Prerequisites

- Bash shell
- `jq` (JSON processor)
- One of: `amp`, `@openai/codex`, or `@anthropic-ai/claude-code`
- Your project's quality check commands (typecheck, lint, format)

### Setup Steps

1. **Create directory structure:**

```bash
mkdir -p scripts/ralph
mkdir -p .agent/skills/prd
mkdir -p .agent/skills/ralph
mkdir -p tasks
```

2. **Copy files** (see [Complete Code](#complete-code) section below):
   - `scripts/ralph/ralph.sh`
   - `scripts/ralph/prompt.md`
   - `scripts/ralph/prd.example.json`
   - `.agent/skills/prd/SKILL.md`
   - `.agent/skills/ralph/SKILL.md`

3. **Make script executable:**

```bash
chmod +x scripts/ralph/ralph.sh
```

4. **Customize `prompt.md`** for your project:
   - Update project context section
   - Update command examples (replace `pnpm` with `npm`/`yarn` if needed)
   - Update file paths for your project structure

5. **Optional: Add to package.json or justfile:**

```json
{
  "scripts": {
    "ralph": "scripts/ralph/ralph.sh"
  }
}
```

Or in `justfile`:

```makefile
ralph *ARGS:
  scripts/ralph/ralph.sh {{ARGS}}
```

---

## Complete Code

### 1. `scripts/ralph/ralph.sh`

```bash
#!/usr/bin/env bash
# Ralph - Long-running AI agent orchestrator
# Usage: ./ralph.sh [max_iterations] [agent]
#
# Executes PRD-driven development through iterative AI agent invocations.
# Each iteration works on one user story from prd.json.

set -e

MAX_ITERATIONS=${1:-10}
AGENT=${2:-amp}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PRD_FILE="$SCRIPT_DIR/prd.json"
PROGRESS_FILE="$SCRIPT_DIR/progress.txt"
ARCHIVE_DIR="$SCRIPT_DIR/archive"
LAST_BRANCH_FILE="$SCRIPT_DIR/.last-branch"

# Archive previous run if branch changed
if [ -f "$PRD_FILE" ] && [ -f "$LAST_BRANCH_FILE" ]; then
  CURRENT_BRANCH=$(jq -r '.branchName // empty' "$PRD_FILE" 2>/dev/null || echo "")
  LAST_BRANCH=$(cat "$LAST_BRANCH_FILE" 2>/dev/null || echo "")

  if [ -n "$CURRENT_BRANCH" ] && [ -n "$LAST_BRANCH" ] && [ "$CURRENT_BRANCH" != "$LAST_BRANCH" ]; then
    # Archive the previous run
    DATE=$(date +%Y-%m-%d)
    # Strip "ralph/" prefix from branch name for folder
    FOLDER_NAME=$(echo "$LAST_BRANCH" | sed 's|^ralph/||')
    ARCHIVE_FOLDER="$ARCHIVE_DIR/$DATE-$FOLDER_NAME"

    echo "📦 Archiving previous run: $LAST_BRANCH"
    mkdir -p "$ARCHIVE_FOLDER"
    [ -f "$PRD_FILE" ] && cp "$PRD_FILE" "$ARCHIVE_FOLDER/"
    [ -f "$PROGRESS_FILE" ] && cp "$PROGRESS_FILE" "$ARCHIVE_FOLDER/"
    echo "   Archived to: $ARCHIVE_FOLDER"

    # Reset progress file for new run
    echo "# Ralph Progress Log" > "$PROGRESS_FILE"
    echo "Started: $(date)" >> "$PROGRESS_FILE"
    echo "---" >> "$PROGRESS_FILE"
  fi
fi

# Track current branch
if [ -f "$PRD_FILE" ]; then
  CURRENT_BRANCH=$(jq -r '.branchName // empty' "$PRD_FILE" 2>/dev/null || echo "")
  if [ -n "$CURRENT_BRANCH" ]; then
    echo "$CURRENT_BRANCH" > "$LAST_BRANCH_FILE"
  fi
fi

# Initialize progress file if it doesn't exist
if [ ! -f "$PROGRESS_FILE" ]; then
  echo "# Ralph Progress Log" > "$PROGRESS_FILE"
  echo "Started: $(date)" >> "$PROGRESS_FILE"
  echo "---" >> "$PROGRESS_FILE"
fi

# Check PRD exists
if [ ! -f "$PRD_FILE" ]; then
  echo "❌ No prd.json found at $PRD_FILE"
  echo "   Create one using the 'ralph' skill or manually."
  exit 1
fi

# Check for remaining stories
REMAINING=$(jq '[.userStories[] | select(.passes == false)] | length' "$PRD_FILE" 2>/dev/null || echo "0")
if [ "$REMAINING" -eq 0 ]; then
  echo "✅ All user stories are complete!"
  exit 0
fi

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║  🤖 Ralph Agent Orchestrator                               ║"
echo "╠════════════════════════════════════════════════════════════╣"
echo "║  Agent:      $AGENT"
echo "║  Iterations: $MAX_ITERATIONS"
echo "║  Remaining:  $REMAINING stories"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

run_agent() {
  local prompt_file="$1"

  case "$AGENT" in
    amp)
      cat "$prompt_file" | amp --dangerously-allow-all 2>&1 | tee /dev/stderr
      ;;
    codex)
      if command -v setsid >/dev/null 2>&1; then
        setsid npx -y @openai/codex exec \
          -c shell_environment_policy.inherit=all \
          --dangerously-bypass-approvals-and-sandbox - < "$prompt_file"
      else
        npx -y @openai/codex exec \
          -c shell_environment_policy.inherit=all \
          --dangerously-bypass-approvals-and-sandbox - < "$prompt_file"
      fi
      ;;
    claude)
      npx -y @anthropic-ai/claude-code --model sonnet --dangerously-skip-permissions -p "$(cat "$prompt_file")" 2>&1 | tee /dev/stderr
      ;;
    *)
      echo "❌ Unsupported agent: $AGENT"
      echo "   Supported agents: amp, codex, claude"
      exit 1
      ;;
  esac
}

for i in $(seq 1 $MAX_ITERATIONS); do
  # Check remaining stories
  REMAINING=$(jq '[.userStories[] | select(.passes == false)] | length' "$PRD_FILE" 2>/dev/null || echo "0")
  if [ "$REMAINING" -eq 0 ]; then
    echo ""
    echo "✅ All user stories complete!"
    echo "   Finished at iteration $i of $MAX_ITERATIONS"
    exit 0
  fi

  NEXT_STORY=$(jq -r '[.userStories[] | select(.passes == false)] | sort_by(.priority) | .[0].id // empty' "$PRD_FILE")

  echo ""
  echo "═══════════════════════════════════════════════════════════"
  echo "  📍 Ralph Iteration $i of $MAX_ITERATIONS"
  echo "  📋 Next story: $NEXT_STORY ($REMAINING remaining)"
  echo "═══════════════════════════════════════════════════════════"

  # Run agent with the prompt
  OUTPUT=$(run_agent "$SCRIPT_DIR/prompt.md") || true

  # Check for completion signal
  if echo "$OUTPUT" | grep -q "<promise>COMPLETE</promise>"; then
    echo ""
    echo "🎉 Ralph completed all tasks!"
    echo "   Finished at iteration $i of $MAX_ITERATIONS"
    exit 0
  fi

  echo ""
  echo "   Iteration $i complete. Continuing..."
  sleep 2
done

echo ""
echo "⏹ Ralph reached max iterations ($MAX_ITERATIONS)."
echo "  Check $PROGRESS_FILE for status."
exit 1
```

### 2. `scripts/ralph/prompt.md`

```markdown
# Ralph Agent Instructions

You are an autonomous coding agent working on [YOUR PROJECT NAME].

## Your Task

1. Read the PRD at `scripts/ralph/prd.json`
2. Read the progress log at `scripts/ralph/progress.txt` (check Codebase Patterns section first)
3. Check you're on the correct branch from PRD `branchName`. If not, check it out or create from main.
4. Pick the **highest priority** user story where `passes: false`
5. **Read the linked task file** (`taskFile` field) for full context - this contains:
   - Detailed requirements and system behaviors
   - User journeys and UX guidelines
   - API contracts and data models
   - Touchpoints (files to modify)
   - Edge cases
6. Implement the story's `scope` (may be full task or a specific section)
7. Run quality checks: `[YOUR TYPECHECK COMMAND]` && `[YOUR LINT COMMAND]` && `[YOUR FORMAT COMMAND]`
8. If checks pass, commit ALL changes with message: `feat: [Story ID] - [Story Title]`
9. Update the PRD to set `passes: true` for the completed story
10. Append your progress to `scripts/ralph/progress.txt`

## Critical: Read the Task File!

The PRD story is just an overview. The `taskFile` contains the real requirements:
- **Summary**: What needs to be done
- **User Journey**: How users interact with the feature
- **UX Guidelines**: Design and interaction patterns
- **System Behaviors**: How the system should work
- **Data & Contracts**: API endpoints, types, schema
- **Acceptance Criteria**: What "done" means
- **Touchpoints**: Files you'll need to modify

The `scope` field tells you which part of the task to implement in this story.

## Project Context

Read these for additional context:
- `AGENT.md` — Agent workflow overview (if you have one)
- `docs/architecture.md` — Architecture overview
- `docs/database.md` — Database patterns
- [Add your project-specific docs here]

## Progress Report Format

APPEND to `scripts/ralph/progress.txt` (never replace, always append):

```
## [Date/Time] - [Story ID]
- What was implemented
- Files changed
- **Learnings for future iterations:**
  - Patterns discovered
  - Gotchas encountered
---
```

## Consolidate Patterns

If you discover a **reusable pattern**, add it to `## Codebase Patterns` at the TOP of progress.txt:

```
## Codebase Patterns
- Example: Use `sql<number>` template for aggregations
- Example: Always use `IF NOT EXISTS` for migrations
```

## Running Commands

```bash
# Replace with your project's commands
npm run typecheck        # TypeScript check
npm run lint             # Lint check
npm run format:check     # Format check
npm test                 # Run tests

# Auto-fix
npm run format           # Fix formatting
npm run lint:fix         # Fix lint issues
```

## Browser Testing (Required for Frontend Stories)

For any story that changes UI, you MUST verify it works using browser tools:

1. Start dev server if not running: `npm run dev`
2. Use browser tools to navigate and interact
3. Verify the UI changes work as expected
4. Take screenshots if needed for documentation

**A frontend story is NOT complete until browser verification passes.**

## Stop Condition

After completing a user story, check if ALL stories have `passes: true`.

If ALL stories are complete, reply with:
<promise>COMPLETE</promise>

If there are still stories with `passes: false`, end your response normally.

## Important

- Work on ONE story per iteration
- **Always read the task file first** - it has the details you need
- Commit frequently with descriptive messages
- Keep CI green
- Do NOT use type escape hatches (`any`, `as unknown`)
```

### 3. `scripts/ralph/prd.example.json`

```json
{
  "project": "Your Project Name",
  "branchName": "ralph/example-feature",
  "description": "Example Feature - Template PRD for Ralph",
  "userStories": [
    {
      "id": "US-001",
      "title": "Add field to database",
      "taskFile": "tasks/prd-001-example-feature.md",
      "scope": "Database schema changes only",
      "acceptanceCriteria": [
        "Add column to table with appropriate type and default",
        "Generate and run migration successfully",
        "Typecheck passes"
      ],
      "priority": 1,
      "passes": false,
      "notes": ""
    },
    {
      "id": "US-002",
      "title": "Display data in UI",
      "taskFile": "tasks/prd-001-example-feature.md",
      "scope": "Frontend display (see UX Guidelines section)",
      "acceptanceCriteria": [
        "Data is visible on the relevant page",
        "Typecheck passes",
        "Verify in browser"
      ],
      "priority": 2,
      "passes": false,
      "notes": ""
    }
  ]
}
```

### 4. `.agent/skills/prd/SKILL.md`

```markdown
---
name: prd
description: "Generate a Product Requirements Document (PRD) for a new feature. Use when planning a feature, starting a new project, or when asked to create a PRD. Triggers on: create a prd, write prd for, plan this feature, requirements for, spec out."
---

# PRD Generator

Create detailed Product Requirements Documents that are clear, actionable, and suitable for implementation.

---

## The Job

1. Receive a feature description from the user
2. Ask 3-5 essential clarifying questions (with lettered options)
3. Generate a structured PRD based on answers
4. Save to `tasks/prd-[feature-name].md`

**Important:** Do NOT start implementing. Just create the PRD.

---

## Step 1: Clarifying Questions

Ask only critical questions where the initial prompt is ambiguous. Focus on:

- **Problem/Goal:** What problem does this solve?
- **Core Functionality:** What are the key actions?
- **Scope/Boundaries:** What should it NOT do?
- **Success Criteria:** How do we know it's done?

### Format Questions Like This:

```
1. What is the primary goal of this feature?
   A. Improve user onboarding experience
   B. Increase user retention
   C. Reduce support burden
   D. Other: [please specify]

2. Who is the target user?
   A. New users only
   B. Existing users only
   C. All users
   D. Admin users only

3. What is the scope?
   A. Minimal viable version
   B. Full-featured implementation
   C. Just the backend/API
   D. Just the UI
```

This lets users respond with "1A, 2C, 3B" for quick iteration.

---

## Step 2: PRD Structure

Generate the PRD with these sections:

### 1. Introduction/Overview
Brief description of the feature and the problem it solves.

### 2. Goals
Specific, measurable objectives (bullet list).

### 3. User Stories
Each story needs:
- **Title:** Short descriptive name
- **Description:** "As a [user], I want [feature] so that [benefit]"
- **Acceptance Criteria:** Verifiable checklist of what "done" means

Each story should be small enough to implement in one focused session.

**Format:**
```markdown
### US-001: [Title]
**Description:** As a [user], I want [feature] so that [benefit].

**Acceptance Criteria:**
- [ ] Specific verifiable criterion
- [ ] Another criterion
- [ ] Typecheck/lint passes
- [ ] **[UI stories only]** Verify in browser
```

**Important:** 
- Acceptance criteria must be verifiable, not vague. "Works correctly" is bad. "Button shows confirmation dialog before deleting" is good.
- **For any story with UI changes:** Always include "Verify in browser" as acceptance criteria.

### 4. Functional Requirements
Numbered list of specific functionalities:
- "FR-1: The system must allow users to..."
- "FR-2: When a user clicks X, the system must..."

Be explicit and unambiguous.

### 5. Non-Goals (Out of Scope)
What this feature will NOT include. Critical for managing scope.

### 6. Design Considerations (Optional)
- UI/UX requirements
- Link to mockups if available
- Relevant existing components to reuse

### 7. Technical Considerations (Optional)
- Known constraints or dependencies
- Integration points with existing systems
- Performance requirements

### 8. Success Metrics
How will success be measured?
- "Reduce time to complete X by 50%"
- "Increase conversion rate by 10%"

### 9. Open Questions
Remaining questions or areas needing clarification.

---

## Writing for Junior Developers

The PRD reader may be a junior developer or AI agent. Therefore:

- Be explicit and unambiguous
- Avoid jargon or explain it
- Provide enough detail to understand purpose and core logic
- Number requirements for easy reference
- Use concrete examples where helpful

---

## Output

- **Format:** Markdown (`.md`)
- **Location:** `tasks/`
- **Filename:** `prd-[feature-name].md` (kebab-case)

---

## Checklist

Before saving the PRD:

- [ ] Asked clarifying questions with lettered options
- [ ] Incorporated user's answers
- [ ] User stories are small and specific
- [ ] Functional requirements are numbered and unambiguous
- [ ] Non-goals section defines clear boundaries
- [ ] Saved to `tasks/prd-[feature-name].md`
```

### 5. `.agent/skills/ralph/SKILL.md`

```markdown
---
name: ralph
description: "Create prd.json orchestration file that links to detailed task files. Use when you have tasks in tasks/ and need to create a Ralph execution plan. Triggers on: create ralph prd, orchestrate tasks, link tasks to prd, ralph json."
---

# Ralph PRD Orchestrator

Creates `prd.json` orchestration files that link to detailed task files in `tasks/`.

---

## The Job

1. Identify task files in `tasks/` directory
2. Create `scripts/ralph/prd.json` with user stories that **link to** these task files
3. Break large tasks into appropriately-scoped stories

---

## Key Principle: Tasks Have the Details

Task files contain the real requirements:
- User journeys, UX guidelines
- System behaviors, edge cases
- API contracts, data models
- Touchpoints (files to modify)
- Acceptance criteria

The PRD is just an **orchestration layer** - it tells Ralph what order to work in and what scope each story covers.

---

## Output Format

```json
{
  "project": "Your Project",
  "branchName": "ralph/[feature-name-kebab-case]",
  "description": "Brief description of what this PRD covers",
  "userStories": [
    {
      "id": "US-001",
      "title": "Short story title",
      "taskFile": "tasks/prd-XXX-task-name.md",
      "scope": "What part of the task to implement",
      "acceptanceCriteria": [
        "Story-specific criteria (subset of task)",
        "Typecheck passes"
      ],
      "priority": 1,
      "passes": false,
      "notes": ""
    }
  ]
}
```

---

## Story Sizing: The Number One Rule

**Each story must be completable in ONE Ralph iteration (one context window).**

Ralph reads the task file for context, but if the task is too big, it won't finish in one iteration.

### Right-sized scopes:
- "Schema changes only" - just database
- "API endpoints only" - backend service + router
- "Frontend UI" - just the UI
- "Full task" - only for small tasks

### Breaking down large tasks:

**Original task:** 30-mobile-tomorrow-delivery-modification.md

**Split into stories:**
1. US-001: Schema changes (scope: "Schema Changes section")
2. US-002: API endpoints (scope: "API Endpoints + System Behaviors")
3. US-003: Mobile UI (scope: "UX Guidelines + User Journey")

Each story links to the SAME task file but with different scopes.

---

## Story Ordering: Dependencies First

Stories execute in priority order. Earlier stories must not depend on later ones.

**Correct order:**
1. Schema/database changes (priority: 1)
2. Backend API (priority: 2)
3. Frontend UI (priority: 3)

---

## Scope Field Examples

The `scope` field tells Ralph what part of the task file to focus on:

```json
// Small task - do everything
"scope": "Full task"

// Just the database part
"scope": "Schema changes only (see 'Schema Changes' section)"

// Backend only
"scope": "API endpoints (see 'Data & Contracts' and 'System Behaviors' sections)"

// Frontend only
"scope": "Frontend UI (see 'UX Guidelines' and 'User Journey' sections)"

// Specific acceptance criteria
"scope": "First 3 acceptance criteria only"
```

---

## Acceptance Criteria in Stories

Story acceptance criteria should be:
1. A **subset** of the task's full acceptance criteria
2. Specific to this story's scope
3. Always include "Typecheck passes"
4. Include "Verify in browser" for UI stories

Don't copy all task criteria - just the ones relevant to this story's scope.

---

## Checklist Before Saving

- [ ] Each story links to a task file via `taskFile`
- [ ] Each story has a clear `scope`
- [ ] Stories are small enough for one iteration
- [ ] Stories are ordered by dependency
- [ ] UI stories have "Verify in browser"
- [ ] All stories have "Typecheck passes"
```

---

## Workflow

### Phase 1: Planning (Create PRD)

1. **User** describes a feature to implement
2. **Trigger PRD skill** in Cursor Composer: "Create a PRD for [feature]"
3. **Agent** asks clarifying questions (with lettered options)
4. **User** responds with answers (e.g., "1A, 2C, 3B")
5. **Agent** generates detailed PRD and saves to `tasks/prd-XXX-feature.md`

### Phase 2: Orchestration (Create prd.json)

1. **Trigger Ralph skill** in Cursor Composer: "Create ralph prd for tasks/prd-XXX-feature.md"
2. **Agent** analyzes the task file
3. **Agent** breaks it into right-sized user stories
4. **Agent** creates `scripts/ralph/prd.json` with:
   - Links to the task file
   - Scope definitions for each story
   - Execution order (priorities)
   - Acceptance criteria

### Phase 3: Execution (Run Ralph)

1. **Run Ralph:**

```bash
./scripts/ralph/ralph.sh 20 amp
# Args: max_iterations (default 10), agent (default amp)
```

2. **Ralph orchestrator:**
   - Checks `prd.json` for incomplete stories
   - Finds highest priority story with `passes: false`
   - Invokes AI agent with `prompt.md`

3. **AI agent** (in each iteration):
   - Reads PRD and progress log
   - Checks out correct branch
   - Reads the full task file
   - Implements the story's scope
   - Runs quality checks
   - Commits changes
   - Updates PRD (`passes: true`)
   - Appends to progress log

4. **Repeat** until all stories have `passes: true` or max iterations reached

### Phase 4: Review

1. **Check progress:**

```bash
cat scripts/ralph/progress.txt
```

2. **Review commits:**

```bash
git log --oneline
```

3. **Run final checks:**

```bash
npm run typecheck && npm run lint && npm test
```

4. **Create PR** when ready

---

## Usage Examples

### Example 1: Simple Feature

```bash
# 1. Create PRD
# In Cursor Composer: "Create a PRD for user profile settings"
# Answer questions, PRD saved to tasks/prd-001-user-profile-settings.md

# 2. Create orchestration
# In Cursor Composer: "Create ralph prd for this task"
# Generates scripts/ralph/prd.json

# 3. Run Ralph
./scripts/ralph/ralph.sh 10 amp

# Ralph will:
# - US-001: Add settings to database (priority 1)
# - US-002: Create API endpoints (priority 2)
# - US-003: Build UI (priority 3)
```

### Example 2: Complex Multi-Task Feature

```bash
# 1. Create multiple PRDs
# "Create PRD for meal planner database"  → tasks/prd-001-planner-db.md
# "Create PRD for meal planner algorithm" → tasks/prd-002-planner-algo.md
# "Create PRD for meal planner API"       → tasks/prd-003-planner-api.md
# "Create PRD for meal planner UI"        → tasks/prd-004-planner-ui.md

# 2. Create orchestration linking all tasks
# "Create ralph prd orchestrating prd-001 through prd-004"

# 3. Run Ralph with more iterations
./scripts/ralph/ralph.sh 30 amp
```

### Example 3: Resume After Interruption

```bash
# Ralph tracks progress in prd.json
# Just run again - it picks up where it left off:
./scripts/ralph/ralph.sh 10 amp
```

### Example 4: Switch to Different Feature

```bash
# 1. Edit scripts/ralph/prd.json with new feature and branchName
# 2. Run Ralph - it automatically archives previous run:
./scripts/ralph/ralph.sh 10 amp

# Previous run saved to:
# scripts/ralph/archive/2026-01-08-previous-feature/
```

---

## Best Practices

### 1. Task File Quality

✅ **Good task files:**
- Include user journeys with step-by-step flows
- Specify exact UX patterns and behaviors
- List all files that need changes (Touchpoints)
- Define API contracts with request/response examples
- Include edge cases and error scenarios

❌ **Bad task files:**
- Vague descriptions ("implement feature X")
- No examples or context
- Missing acceptance criteria
- Ambiguous requirements

### 2. Story Sizing

✅ **Right-sized stories:**
- Completable in one context window (~10-30 minutes of work)
- Clear scope (e.g., "database only", "API only", "UI only")
- Single responsibility

❌ **Wrong-sized stories:**
- "Implement entire feature" (too big)
- "Change one variable" (too small)
- Multiple unrelated changes

### 3. Story Ordering

✅ **Correct order:**
1. Database schema
2. Backend API/services
3. Frontend UI
4. Integration tests

❌ **Wrong order:**
1. Frontend UI (can't work without API!)
2. Database schema (breaks build)
3. Backend API

### 4. Progress Log Usage

✅ **Use progress log to:**
- Document patterns discovered (`## Codebase Patterns`)
- Record gotchas and solutions
- Track which files were changed
- Note learnings for future iterations

❌ **Don't:**
- Replace the log (always append!)
- Skip updating it
- Write vague entries ("fixed stuff")

### 5. Quality Gates

✅ **Always enforce:**
- Typecheck passes
- Lint passes
- Format check passes
- Tests pass (if applicable)
- Browser verification for UI (manual or automated)

❌ **Never:**
- Commit with linter errors
- Skip quality checks to "move faster"
- Use type escape hatches (`any`, `as unknown`)

### 6. Branch Management

✅ **Good practices:**
- Use `ralph/feature-name` branch naming
- Create branches from main/master
- Keep branches focused on one PRD
- Archive automatically handles switches

❌ **Bad practices:**
- Working directly on main
- Mixing multiple features in one branch
- Forgetting to push between iterations

### 7. Agent Selection

- **`amp`** (Anthropic Claude via Cursor): Best for complex tasks, good context handling
- **`codex`** (OpenAI): Good for straightforward implementations
- **`claude`** (Anthropic direct): Alternative to amp

Choose based on:
- Task complexity
- Your API keys
- Cost considerations

### 8. Iteration Limits

- Start with **10 iterations** for simple features
- Use **20-30 iterations** for complex multi-task features
- Can always run again if it stops early
- Better to set high and finish early than run out

### 9. Monitoring Progress

Check progress regularly:

```bash
# Quick status
jq '.userStories[] | select(.passes == false) | .id + ": " + .title' scripts/ralph/prd.json

# Full progress
cat scripts/ralph/progress.txt | less

# Recent commits
git log --oneline -10
```

### 10. When Things Go Wrong

If Ralph gets stuck or makes mistakes:

1. **Check the progress log** - what went wrong?
2. **Review recent commits** - revert if needed
3. **Update the task file** - add more clarity/examples
4. **Adjust story scope** - maybe it's too big
5. **Update codebase patterns** - help future iterations
6. **Manual fix + continue** - fix the issue and run Ralph again

---

## Customization Guide

### Adapting for Your Project

1. **Update `prompt.md`:**
   - Replace project name
   - Update command examples (npm/yarn/pnpm)
   - Add project-specific documentation links
   - Customize quality check commands
   - Add project-specific patterns section

2. **Update `prd.example.json`:**
   - Use your project name
   - Use your branch naming convention
   - Add examples relevant to your stack

3. **Customize skills:**
   - Adjust PRD structure for your workflow
   - Add domain-specific sections
   - Update acceptance criteria templates

4. **Add project-specific helpers:**
   - Database migration commands
   - Testing frameworks
   - Deployment checks

### Example: Adapting for Python/Django

```markdown
## Running Commands

```bash
python manage.py check        # Django system check
python manage.py makemigrations --check  # Migration check
black --check .               # Format check
mypy .                        # Type check
pytest                        # Run tests

# Auto-fix
black .                       # Fix formatting
isort .                       # Sort imports
```
```

### Example: Adapting for Go

```markdown
## Running Commands

```bash
go build ./...                # Build check
go test ./...                 # Run tests
gofmt -l .                    # Format check
golangci-lint run            # Lint check
```
```

---

## Troubleshooting

### Ralph won't start

**Problem:** `No prd.json found`

**Solution:** Create `scripts/ralph/prd.json` using the Ralph skill or manually

---

**Problem:** `jq: command not found`

**Solution:** Install jq:
```bash
# macOS
brew install jq

# Ubuntu/Debian
sudo apt-get install jq

# Windows (via Chocolatey)
choco install jq
```

---

### Agent fails to run

**Problem:** `Unsupported agent: xyz`

**Solution:** Use `amp`, `codex`, or `claude`. Install if needed:
```bash
npm install -g @openai/codex
npm install -g @anthropic-ai/claude-code
```

---

**Problem:** Agent hangs or errors

**Solution:**
1. Check your API keys are set
2. Try a different agent
3. Check internet connection
4. Review agent-specific logs

---

### Stories not completing

**Problem:** Agent can't finish story in one iteration

**Solution:**
1. Story is too big - break it down further in `prd.json`
2. Task file lacks detail - add more examples and context
3. Codebase patterns missing - update progress log with patterns

---

**Problem:** Agent makes mistakes repeatedly

**Solution:**
1. Update `## Codebase Patterns` section in progress.txt
2. Add examples to task file
3. Update acceptance criteria to be more specific
4. Consider manual fix and continue

---

### Progress tracking issues

**Problem:** Progress log gets overwritten

**Solution:** Agent should APPEND only. If this happens, check:
1. Prompt says "APPEND to" (not "write to")
2. Agent understands to add to end of file
3. Restore from `archive/` if needed

---

**Problem:** PRD not updating (`passes` still false)

**Solution:**
1. Check acceptance criteria - maybe not all met
2. Agent may have failed quality checks
3. Review recent commits - story may not be complete
4. Manually update if agent skipped this step

---

## Advanced Usage

### Running Multiple PRDs Simultaneously

Run different features in parallel:

```bash
# Terminal 1
cd project-a
./scripts/ralph/ralph.sh 10 amp

# Terminal 2
cd project-b
./scripts/ralph/ralph.sh 10 codex
```

### Integrating with CI/CD

Add Ralph to your CI pipeline:

```yaml
# .github/workflows/ralph.yml
name: Ralph Auto-Implementation

on:
  workflow_dispatch:
    inputs:
      max_iterations:
        description: 'Max iterations'
        default: '10'

jobs:
  ralph:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run Ralph
        run: |
          ./scripts/ralph/ralph.sh ${{ inputs.max_iterations }} amp
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
      - name: Create PR
        uses: peter-evans/create-pull-request@v5
        with:
          commit-message: 'feat: Ralph auto-implementation'
          branch: ralph-auto-${{ github.run_number }}
```

### Custom Quality Gates

Add custom checks to `prompt.md`:

```markdown
## Running Commands

```bash
# Standard checks
npm run typecheck
npm run lint
npm run format:check

# Custom checks
npm run test:integration    # Integration tests
npm run security:check      # Security audit
npm run performance:test    # Performance benchmarks
npm run a11y:check          # Accessibility check
```
```

### Integrating with Task Tracking

Link to Jira/Linear/GitHub Issues:

```json
{
  "id": "US-001",
  "title": "Add user settings",
  "taskFile": "tasks/prd-001-user-settings.md",
  "issueUrl": "https://linear.app/team/issue/PROJ-123",
  "scope": "Full task",
  ...
}
```

Add to progress log template:

```markdown
## [Date/Time] - [Story ID]
- Issue: [Issue URL]
- What was implemented
- Files changed
```

---

## FAQ

### Q: Can Ralph work with non-JavaScript projects?

**A:** Yes! Ralph is language-agnostic. Just update:
- Quality check commands in `prompt.md`
- Task file structure for your stack
- Agent prompt with relevant patterns

### Q: How long does each iteration take?

**A:** Typically 2-10 minutes depending on:
- Story complexity
- Agent speed
- Codebase size
- Quality checks duration

### Q: Can I pause and resume?

**A:** Yes! Ralph tracks progress in `prd.json`. Just run the script again and it picks up where it left off.

### Q: What if I want to skip a story?

**A:** Manually set `"passes": true` in `prd.json` for that story, and Ralph will skip it.

### Q: Can I reorder stories mid-execution?

**A:** Yes! Edit the `priority` field in `prd.json`. Lower numbers run first.

### Q: How do I debug when Ralph goes wrong?

**A:**
1. Check `scripts/ralph/progress.txt` for error logs
2. Review recent git commits
3. Run quality checks manually
4. Check the task file for clarity
5. Update `## Codebase Patterns` to guide future iterations

### Q: Can I use Ralph for bug fixes?

**A:** Yes! Create a PRD describing:
- Bug description and reproduction steps
- Root cause (if known)
- Expected vs actual behavior
- Acceptance criteria for fix

### Q: What's the difference between `prd.json` and task files?

**A:**
- **Task files** (`tasks/prd-XXX.md`): Detailed requirements, full context
- **`prd.json`**: Orchestration layer - execution order, scope, progress tracking

Think: Task files = the book, `prd.json` = the table of contents.

### Q: Can I run Ralph without Cursor?

**A:** Yes! Ralph uses command-line AI agents:
- `amp` (Anthropic Claude via Cursor)
- `codex` (OpenAI)
- `claude` (Anthropic direct)

You can use any agent that accepts stdin prompts.

---

## License

This setup guide is provided as-is. Adapt it freely for your projects.

---

## Contributing

Found improvements or have suggestions? Create issues or PRs in your project repository.

---

## Credits

Originally developed for the Nutribox project by the FRM Labz team.

---

**Happy automating! 🚀**

