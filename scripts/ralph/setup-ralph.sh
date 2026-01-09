#!/usr/bin/env bash
# Ralph Setup Script
# Usage: curl -sSL [url-to-this-script] | bash
# Or: ./setup-ralph.sh

set -e

echo "🤖 Ralph Setup Script"
echo "===================="
echo ""

# Check prerequisites
echo "Checking prerequisites..."

if ! command -v jq &> /dev/null; then
    echo "❌ jq is not installed. Please install it first:"
    echo "   macOS: brew install jq"
    echo "   Ubuntu/Debian: sudo apt-get install jq"
    echo "   Windows: choco install jq"
    exit 1
fi
echo "✅ jq found"

# Detect project root (look for package.json, go.mod, requirements.txt, etc.)
if [ -f "package.json" ]; then
    PROJECT_TYPE="node"
    echo "✅ Detected Node.js project"
elif [ -f "go.mod" ]; then
    PROJECT_TYPE="go"
    echo "✅ Detected Go project"
elif [ -f "requirements.txt" ] || [ -f "pyproject.toml" ]; then
    PROJECT_TYPE="python"
    echo "✅ Detected Python project"
else
    PROJECT_TYPE="unknown"
    echo "⚠️  Could not detect project type"
fi

echo ""
echo "Creating directory structure..."

# Create directories
mkdir -p scripts/ralph/archive
mkdir -p .agent/skills/prd
mkdir -p .agent/skills/ralph
mkdir -p tasks

echo "✅ Directories created"
echo ""

# Create ralph.sh
echo "Creating ralph.sh..."
cat > scripts/ralph/ralph.sh << 'RALPH_SCRIPT'
#!/usr/bin/env bash
# Ralph - Long-running AI agent orchestrator
# Usage: ./ralph.sh [max_iterations] [agent]

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
    DATE=$(date +%Y-%m-%d)
    FOLDER_NAME=$(echo "$LAST_BRANCH" | sed 's|^ralph/||')
    ARCHIVE_FOLDER="$ARCHIVE_DIR/$DATE-$FOLDER_NAME"

    echo "📦 Archiving previous run: $LAST_BRANCH"
    mkdir -p "$ARCHIVE_FOLDER"
    [ -f "$PRD_FILE" ] && cp "$PRD_FILE" "$ARCHIVE_FOLDER/"
    [ -f "$PROGRESS_FILE" ] && cp "$PROGRESS_FILE" "$ARCHIVE_FOLDER/"
    echo "   Archived to: $ARCHIVE_FOLDER"

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

# Initialize progress file
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

  OUTPUT=$(run_agent "$SCRIPT_DIR/prompt.md") || true

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
RALPH_SCRIPT

chmod +x scripts/ralph/ralph.sh
echo "✅ ralph.sh created"
echo ""

# Create prompt.md based on project type
echo "Creating prompt.md..."

if [ "$PROJECT_TYPE" = "node" ]; then
    TYPECHECK_CMD="npm run typecheck"
    LINT_CMD="npm run lint"
    FORMAT_CMD="npm run format:check"
    DEV_CMD="npm run dev"
elif [ "$PROJECT_TYPE" = "python" ]; then
    TYPECHECK_CMD="mypy ."
    LINT_CMD="flake8"
    FORMAT_CMD="black --check ."
    DEV_CMD="python manage.py runserver"
elif [ "$PROJECT_TYPE" = "go" ]; then
    TYPECHECK_CMD="go build ./..."
    LINT_CMD="golangci-lint run"
    FORMAT_CMD="gofmt -l ."
    DEV_CMD="go run ."
else
    TYPECHECK_CMD="[YOUR TYPECHECK COMMAND]"
    LINT_CMD="[YOUR LINT COMMAND]"
    FORMAT_CMD="[YOUR FORMAT COMMAND]"
    DEV_CMD="[YOUR DEV SERVER COMMAND]"
fi

cat > scripts/ralph/prompt.md << PROMPT
# Ralph Agent Instructions

You are an autonomous coding agent working on this project.

## Your Task

1. Read the PRD at \`scripts/ralph/prd.json\`
2. Read the progress log at \`scripts/ralph/progress.txt\` (check Codebase Patterns section first)
3. Check you're on the correct branch from PRD \`branchName\`. If not, check it out or create from main.
4. Pick the **highest priority** user story where \`passes: false\`
5. **Read the linked task file** (\`taskFile\` field) for full context - this contains:
   - Detailed requirements and system behaviors
   - User journeys and UX guidelines
   - API contracts and data models
   - Touchpoints (files to modify)
   - Edge cases
6. Implement the story's \`scope\` (may be full task or a specific section)
7. Run quality checks: \`$TYPECHECK_CMD && $LINT_CMD && $FORMAT_CMD\`
8. If checks pass, commit ALL changes with message: \`feat: [Story ID] - [Story Title]\`
9. Update the PRD to set \`passes: true\` for the completed story
10. Append your progress to \`scripts/ralph/progress.txt\`

## Critical: Read the Task File!

The PRD story is just an overview. The \`taskFile\` contains the real requirements:
- **Summary**: What needs to be done
- **User Journey**: How users interact with the feature
- **UX Guidelines**: Design and interaction patterns
- **System Behaviors**: How the system should work
- **Data & Contracts**: API endpoints, types, schema
- **Acceptance Criteria**: What "done" means
- **Touchpoints**: Files you'll need to modify

The \`scope\` field tells you which part of the task to implement in this story.

## Project Context

Read these for additional context:
- \`README.md\` — Project overview
- \`ARCHITECTURE.md\` — Architecture patterns (if exists)
- Project-specific docs in \`docs/\`

## Progress Report Format

APPEND to \`scripts/ralph/progress.txt\` (never replace, always append):

\`\`\`
## [Date/Time] - [Story ID]
- What was implemented
- Files changed
- **Learnings for future iterations:**
  - Patterns discovered
  - Gotchas encountered
---
\`\`\`

## Consolidate Patterns

If you discover a **reusable pattern**, add it to \`## Codebase Patterns\` at the TOP of progress.txt:

\`\`\`
## Codebase Patterns
- Example: Use specific pattern for X
- Example: Always check Y before Z
\`\`\`

## Running Commands

\`\`\`bash
$TYPECHECK_CMD       # Type check
$LINT_CMD            # Lint check
$FORMAT_CMD          # Format check

# Dev server
$DEV_CMD
\`\`\`

## Browser Testing (Required for Frontend Stories)

For any story that changes UI, you MUST verify it works:

1. Start dev server if not running: \`$DEV_CMD\`
2. Use browser tools to navigate and interact
3. Verify the UI changes work as expected

**A frontend story is NOT complete until browser verification passes.**

## Stop Condition

After completing a user story, check if ALL stories have \`passes: true\`.

If ALL stories are complete, reply with:
<promise>COMPLETE</promise>

If there are still stories with \`passes: false\`, end your response normally.

## Important

- Work on ONE story per iteration
- **Always read the task file first** - it has the details you need
- Commit frequently with descriptive messages
- Keep CI green
- Do NOT use type escape hatches (\`any\`, \`as unknown\`)
PROMPT

echo "✅ prompt.md created"
echo ""

# Create prd.example.json
echo "Creating prd.example.json..."
cat > scripts/ralph/prd.example.json << 'PRD_EXAMPLE'
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
PRD_EXAMPLE

echo "✅ prd.example.json created"
echo ""

# Create PRD skill
echo "Creating PRD skill..."
cat > .agent/skills/prd/SKILL.md << 'PRD_SKILL'
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
```

This lets users respond with "1A, 2C, 3B" for quick iteration.

---

## Step 2: PRD Structure

### 1. Introduction/Overview
Brief description of the feature and the problem it solves.

### 2. Goals
Specific, measurable objectives (bullet list).

### 3. User Stories
Each story needs:
- **Title:** Short descriptive name
- **Description:** "As a [user], I want [feature] so that [benefit]"
- **Acceptance Criteria:** Verifiable checklist of what "done" means

**Format:**
```markdown
### US-001: [Title]
**Description:** As a [user], I want [feature] so that [benefit].

**Acceptance Criteria:**
- [ ] Specific verifiable criterion
- [ ] Typecheck/lint passes
- [ ] **[UI stories only]** Verify in browser
```

### 4. Functional Requirements
Numbered list: "FR-1: The system must allow users to..."

### 5. Non-Goals (Out of Scope)
What this feature will NOT include.

### 6-9. Design, Technical, Success Metrics, Open Questions
Optional sections as needed.

---

## Output

- **Format:** Markdown (`.md`)
- **Location:** `tasks/`
- **Filename:** `prd-[feature-name].md` (kebab-case)
PRD_SKILL

echo "✅ PRD skill created"
echo ""

# Create Ralph skill
echo "Creating Ralph skill..."
cat > .agent/skills/ralph/SKILL.md << 'RALPH_SKILL'
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

Task files contain the real requirements. The PRD is just an **orchestration layer**.

---

## Output Format

```json
{
  "project": "Your Project",
  "branchName": "ralph/[feature-name-kebab-case]",
  "description": "Brief description",
  "userStories": [
    {
      "id": "US-001",
      "title": "Short story title",
      "taskFile": "tasks/prd-XXX-task-name.md",
      "scope": "What part of the task to implement",
      "acceptanceCriteria": ["Story-specific criteria", "Typecheck passes"],
      "priority": 1,
      "passes": false,
      "notes": ""
    }
  ]
}
```

---

## Story Sizing

**Each story must be completable in ONE Ralph iteration.**

Right-sized scopes:
- "Schema changes only"
- "API endpoints only"
- "Frontend UI"

---

## Checklist Before Saving

- [ ] Each story links to a task file via `taskFile`
- [ ] Each story has a clear `scope`
- [ ] Stories are small enough for one iteration
- [ ] Stories are ordered by dependency
- [ ] UI stories have "Verify in browser"
- [ ] All stories have "Typecheck passes"
RALPH_SKILL

echo "✅ Ralph skill created"
echo ""

# Create README
echo "Creating README..."
cat > scripts/ralph/README.md << 'README'
# Ralph - AI Agent Orchestrator

Automated PRD-driven development through iterative AI agent execution.

## Quick Start

1. **Create a PRD**: In Cursor Composer, say "Create a PRD for [feature]"
2. **Create orchestration**: Say "Create ralph prd for tasks/prd-XXX-feature.md"
3. **Run Ralph**: `./scripts/ralph/ralph.sh 10 amp`

## Commands

```bash
# Run with defaults (10 iterations, amp agent)
./scripts/ralph/ralph.sh

# Specify iterations and agent
./scripts/ralph/ralph.sh 20 codex

# Check progress
cat scripts/ralph/progress.txt

# Check remaining stories
jq '.userStories[] | select(.passes == false)' scripts/ralph/prd.json
```

## Agents

- `amp` - Anthropic Claude (via Cursor) - recommended
- `codex` - OpenAI
- `claude` - Anthropic direct

## Files

- `ralph.sh` - Main orchestrator
- `prompt.md` - Agent instructions
- `prd.json` - Current execution plan
- `progress.txt` - Progress log with learnings
- `archive/` - Previous runs

## Documentation

See project root for `RALPH_SETUP_GUIDE.md` with complete documentation.
README

echo "✅ README created"
echo ""

echo "╔════════════════════════════════════════════════════════════╗"
echo "║  ✅ Ralph Setup Complete!                                  ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "Next steps:"
echo "1. Customize scripts/ralph/prompt.md for your project"
echo "2. In Cursor Composer, say: 'Create a PRD for [feature]'"
echo "3. Then say: 'Create ralph prd for tasks/prd-XXX-feature.md'"
echo "4. Run: ./scripts/ralph/ralph.sh 10 amp"
echo ""
echo "Documentation:"
echo "- Quick reference: scripts/ralph/README.md"
echo "- Full guide: RALPH_SETUP_GUIDE.md (if available)"
echo ""
echo "Happy automating! 🚀"

