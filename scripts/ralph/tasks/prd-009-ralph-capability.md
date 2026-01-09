# PRD-009: Ralph Capability

## Introduction

Ralph is an AI agent orchestrator capability for OmniDev. It enables long-running, PRD-driven development through iterative AI agent invocations. Each iteration works on one user story until all acceptance criteria are met.

Ralph integrates as a first-class OmniDev capability with:
- CLI commands (`omnidev ralph <subcommand>`)
- Sync hooks (creates `.omni/ralph/` structure)
- Skills and rules (guides AI in creating/executing PRDs)
- Sandbox API (for `omni_execute`)

---

## Goals

1. **CLI Integration** - Access Ralph via `omnidev ralph <subcommand>`
2. **Capability Architecture** - Follow OmniDev capability patterns
3. **Multi-Agent Support** - Orchestrate Claude, Codex, or Amp agents
4. **Organized State** - Keep PRDs, specs, and progress in `.omni/ralph/`
5. **Lifecycle Management** - Track active vs completed work, auto-cleanup

---

## User Stories

### US-038: Create Ralph capability structure

**Description:** As a developer, I want the Ralph capability to have proper structure so it integrates with OmniDev.

**Acceptance Criteria:**
- [ ] `capabilities/ralph/capability.toml` exists with metadata
- [ ] `capabilities/ralph/package.json` exists
- [ ] `capabilities/ralph/index.ts` exists with placeholder exports
- [ ] `capabilities/ralph/types.d.ts` exists with interfaces
- [ ] `capabilities/ralph/definition.md` exists with description
- [ ] Capability discovered by loader
- [ ] Typecheck passes

### US-039: Implement Ralph state management

**Description:** As a developer, I want Ralph to persist PRDs, stories, and progress so state survives restarts.

**Acceptance Criteria:**
- [ ] `listPRDs`, `getPRD`, `createPRD`, `updatePRD`, `archivePRD` functions work
- [ ] `getNextStory`, `markStoryPassed`, `markStoryFailed` functions work
- [ ] `appendProgress`, `getProgress`, `getPatterns` functions work
- [ ] `getActivePRD`, `setActivePRD` functions work
- [ ] State persisted to `.omni/ralph/`
- [ ] Tests cover state operations
- [ ] Typecheck passes

### US-040: Implement Ralph sync hook

**Description:** As a developer, I want Ralph to set up its directory structure when `omnidev agents sync` runs.

**Acceptance Criteria:**
- [ ] Sync creates `.omni/ralph/` directory structure
- [ ] Sync creates default `config.toml` if not exists
- [ ] Sync validates existing PRDs
- [ ] Sync updates `.gitignore`
- [ ] `omnidev agents sync` triggers Ralph sync
- [ ] Typecheck passes

### US-041: Implement Ralph CLI commands (core)

**Description:** As a developer, I want core Ralph CLI commands so I can initialize and run orchestration.

**Acceptance Criteria:**
- [ ] `omnidev ralph init` creates structure
- [ ] `omnidev ralph start` spawns agent and runs iterations
- [ ] `omnidev ralph stop` gracefully stops
- [ ] `omnidev ralph status` shows current state
- [ ] Typecheck passes

### US-042: Implement Ralph CLI commands (management)

**Description:** As a developer, I want management commands so I can create and manage PRDs, stories, and specs.

**Acceptance Criteria:**
- [ ] `omnidev ralph prd list/create/select/view/archive/delete` work
- [ ] `omnidev ralph story list/pass/reset/add` work
- [ ] `omnidev ralph spec list/create/view` work
- [ ] `omnidev ralph log` and `omnidev ralph patterns` work
- [ ] Typecheck passes

### US-043: Create Ralph skills and rules

**Description:** As a developer, I want Ralph skills and rules so AI agents know how to create and execute PRDs.

**Acceptance Criteria:**
- [ ] `skills/prd-creation/SKILL.md` exists
- [ ] `skills/ralph-orchestration/SKILL.md` exists
- [ ] `rules/prd-structure.md` exists
- [ ] `rules/iteration-workflow.md` exists
- [ ] Skills and rules discovered by loader
- [ ] Typecheck passes

---

## Directory Structure

```
.omni/
├── ralph/
│   ├── config.toml          # Ralph configuration
│   ├── active-prd           # Currently active PRD name
│   ├── prds/
│   │   └── <prd-name>/
│   │       ├── prd.json           # PRD definition
│   │       ├── progress.txt       # Progress log
│   │       └── specs/
│   │           └── 001-feature.md
│   └── completed-prds/
│       └── 2026-01-09-feature/    # Archived PRDs
```

---

## Capability Structure

```
capabilities/ralph/
├── capability.toml           # Capability metadata
├── package.json              # Dependencies
├── index.ts                  # Sandbox exports
├── types.d.ts                # Type definitions
├── definition.md             # Capability description
├── skills/
│   ├── prd-creation/
│   │   └── SKILL.md
│   └── ralph-orchestration/
│       └── SKILL.md
├── rules/
│   ├── prd-structure.md
│   └── iteration-workflow.md
└── docs/
    ├── agent-prompt.md       # Template for agent instructions
    └── spec-template.md      # Template for spec files
```

---

## Functional Requirements

### FR-1: Capability Structure

The capability must have:

**capability.toml:**
```toml
[capability]
id = "ralph"
name = "Ralph Orchestrator"
version = "1.0.0"
description = "AI agent orchestrator for PRD-driven development"

[capability.requires]
env = []

[capability.sync]
on_sync = "sync"

[capability.cli]
commands = ["ralph"]
```

**package.json:**
```json
{
  "name": "ralph",
  "version": "1.0.0",
  "type": "module",
  "main": "index.ts",
  "dependencies": {}
}
```

### FR-2: State Management

The state module must provide:

```typescript
// PRD operations
function listPRDs(): Promise<string[]>
function getPRD(name: string): Promise<PRD>
function createPRD(name: string, options: Partial<PRD>): Promise<PRD>
function updatePRD(name: string, updates: Partial<PRD>): Promise<PRD>
function archivePRD(name: string): Promise<void>

// Story operations
function getNextStory(prdName: string): Promise<Story | null>
function markStoryPassed(prdName: string, storyId: string): Promise<void>
function markStoryFailed(prdName: string, storyId: string): Promise<void>

// Progress operations
function appendProgress(prdName: string, content: string): Promise<void>
function getProgress(prdName: string): Promise<string>
function getPatterns(prdName: string): Promise<string[]>

// Active PRD
function getActivePRD(): Promise<string | null>
function setActivePRD(name: string): Promise<void>
```

**PRD Interface:**
```typescript
interface Story {
  id: string;
  title: string;
  specFile: string;
  scope: string;
  acceptanceCriteria: string[];
  priority: number;
  passes: boolean;
  notes: string;
}

interface PRD {
  name: string;
  branchName: string;
  description: string;
  createdAt: string;
  userStories: Story[];
}
```

### FR-3: Sync Hook

The sync function must:

1. Create directory structure:
   ```
   .omni/ralph/
   .omni/ralph/prds/
   .omni/ralph/completed-prds/
   ```

2. Create default config if not exists:
   ```toml
   [ralph]
   default_agent = "claude"
   default_iterations = 10
   auto_archive = true
   
   [agents.claude]
   command = "npx"
   args = ["-y", "@anthropic-ai/claude-code", "--model", "sonnet", "--dangerously-skip-permissions", "-p"]
   
   [agents.codex]
   command = "npx"
   args = ["-y", "@openai/codex", "exec", "-c", "shell_environment_policy.inherit=all", "--dangerously-bypass-approvals-and-sandbox", "-"]
   
   [agents.amp]
   command = "amp"
   args = ["--dangerously-allow-all"]
   ```

3. Update `.gitignore` with `.omni/ralph/` if not present

### FR-4: CLI Commands (Core)

**omnidev ralph init:**
- Creates `.omni/ralph/` directory structure
- Creates default `config.toml`
- Shows success message

**omnidev ralph start:**
- Options: `--agent <name>`, `--iterations <n>`, `--prd <name>`
- Validates PRD exists and has incomplete stories
- Generates prompt from template with PRD context
- Spawns agent process with prompt
- Monitors for completion signal or max iterations
- Updates PRD when stories complete

**omnidev ralph stop:**
- Gracefully stops running orchestration
- Writes current state

**omnidev ralph status:**
- Option: `--prd <name>`
- Shows active PRD name
- Shows story progress (X of Y complete)
- Shows remaining stories

### FR-5: CLI Commands (Management)

**PRD Commands:**
```bash
omnidev ralph prd list [--all]        # List PRDs (--all includes completed)
omnidev ralph prd create <name>       # Create new PRD interactively
omnidev ralph prd select <name>       # Set active PRD
omnidev ralph prd view <name>         # View PRD details
omnidev ralph prd archive <name>      # Move to completed-prds/
omnidev ralph prd delete <name>       # Delete PRD (with confirmation)
```

**Story Commands:**
```bash
omnidev ralph story list [--prd <name>]              # List stories
omnidev ralph story pass <id> [--prd <name>]         # Mark passed
omnidev ralph story reset <id> [--prd <name>]        # Reset to failed
omnidev ralph story add <title> --spec <file>        # Add story
```

**Spec Commands:**
```bash
omnidev ralph spec list [--prd <name>]               # List specs
omnidev ralph spec create <name> [--prd <name>]      # Create spec
omnidev ralph spec view <name> [--prd <name>]        # View spec
```

**Utility Commands:**
```bash
omnidev ralph log [--prd <name>] [--tail <n>]        # View progress log
omnidev ralph patterns [--prd <name>]                # View codebase patterns
omnidev ralph cleanup [--older-than <days>]          # Clean old completed PRDs
```

### FR-6: Agent Prompt Template

The prompt template at `docs/agent-prompt.md`:

```markdown
# Ralph Iteration Instructions

You are an autonomous coding agent working on the {project} project.

## Current PRD: {prd_name}
Branch: {branch_name}
Description: {description}

## Your Task

1. Read the progress log at `.omni/ralph/prds/{prd_name}/progress.txt`
2. Check you're on branch `{branch_name}`. If not, check it out or create from main.
3. Pick the **highest priority** user story where `passes: false`
4. **Read the spec file** for full context
5. Implement the story's `scope`
6. Run quality checks: `bun run check`
7. If checks pass, commit with message: `feat: [{story_id}] - {story_title}`
8. Update `.omni/ralph/prds/{prd_name}/prd.json` - set story's `passes: true`
9. Append progress to `.omni/ralph/prds/{prd_name}/progress.txt`

## Current Story

**{story_id}: {story_title}**
- Spec: {spec_file}
- Scope: {scope}
- Acceptance Criteria:
{acceptance_criteria}

## Progress So Far

{progress_summary}

## Codebase Patterns

{codebase_patterns}

## Quality Commands

```bash
bun run check         # typecheck + lint + format
bun test              # run tests
```

## Stop Condition

After completing the story, if ALL stories have `passes: true`, reply with:
<promise>COMPLETE</promise>

Otherwise, end your response normally.

## Important

- Work on ONE story per iteration
- Read the spec file first - it has the details
- Commit after each story
- Keep quality checks green
- Do NOT use type escape hatches
```

### FR-7: Skills

**skills/prd-creation/SKILL.md:**
```markdown
---
name: prd
description: "Generate a Product Requirements Document (PRD). Triggers on: create a prd, write prd for, plan this feature."
---

# PRD Generator

Create detailed PRDs for Ralph orchestration.

## The Job

1. Receive a feature description
2. Ask 3-5 clarifying questions (with lettered options)
3. Generate structured PRD
4. Save to `.omni/ralph/prds/<name>/prd.json`
5. Create spec files in `.omni/ralph/prds/<name>/specs/`

## PRD Structure

{prd_structure_details}
```

**skills/ralph-orchestration/SKILL.md:**
```markdown
---
name: ralph
description: "Work on a Ralph PRD. Triggers on: work on prd, continue ralph, next story."
---

# Ralph Orchestration

Execute PRD-driven development workflow.

## The Job

1. Read current PRD and progress
2. Pick highest priority incomplete story
3. Read spec file for context
4. Implement the story's scope
5. Run quality checks
6. Commit changes
7. Update PRD and progress

{iteration_workflow_details}
```

### FR-8: Rules

**rules/prd-structure.md:**
```markdown
# PRD Structure Rules

When creating or modifying PRDs:

1. Each PRD lives in `.omni/ralph/prds/<name>/`
2. PRD folder contains: prd.json, progress.txt, specs/
3. Stories must have unique IDs (US-001, US-002, etc.)
4. Stories must link to spec files
5. Priority determines execution order (lower = first)
6. Acceptance criteria must be verifiable
```

**rules/iteration-workflow.md:**
```markdown
# Iteration Workflow Rules

During Ralph iterations:

1. Always read progress.txt first for patterns
2. Check out correct branch before working
3. Only work on ONE story per iteration
4. Run quality checks before committing
5. Commit with format: `feat: [US-XXX] - Title`
6. Update prd.json to mark story passed
7. Append progress with learnings
8. Signal completion when all stories pass
```

---

## Technical Considerations

### Agent Spawning

Use Bun's subprocess API to spawn agents:

```typescript
import { spawn } from "bun";

async function runAgent(prompt: string, agent: AgentConfig): Promise<string> {
  const proc = spawn({
    cmd: [agent.command, ...agent.args],
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe",
  });
  
  proc.stdin.write(prompt);
  proc.stdin.end();
  
  const output = await new Response(proc.stdout).text();
  const exitCode = await proc.exited;
  
  return output;
}
```

### Iteration Loop

```typescript
async function runOrchestration(
  prdName: string,
  agent: string,
  maxIterations: number
): Promise<void> {
  for (let i = 0; i < maxIterations; i++) {
    const prd = await getPRD(prdName);
    const story = await getNextStory(prdName);
    
    if (!story) {
      console.log("All stories complete!");
      if (config.auto_archive) {
        await archivePRD(prdName);
      }
      return;
    }
    
    const prompt = generatePrompt(prd, story);
    const output = await runAgent(prompt, agents[agent]);
    
    if (output.includes("<promise>COMPLETE</promise>")) {
      console.log("Ralph completed all tasks!");
      return;
    }
  }
  
  console.log(`Reached max iterations (${maxIterations})`);
}
```

### Progress Parsing

Extract codebase patterns from progress:

```typescript
function getPatterns(progressContent: string): string[] {
  const lines = progressContent.split("\n");
  const patterns: string[] = [];
  let inPatternsSection = false;
  
  for (const line of lines) {
    if (line.startsWith("## Codebase Patterns")) {
      inPatternsSection = true;
      continue;
    }
    if (line.startsWith("## ") && inPatternsSection) {
      break;
    }
    if (inPatternsSection && line.startsWith("- ")) {
      patterns.push(line.slice(2));
    }
  }
  
  return patterns;
}
```

---

## Touchpoints

### Files to Create

- `capabilities/ralph/capability.toml`
- `capabilities/ralph/package.json`
- `capabilities/ralph/index.ts`
- `capabilities/ralph/types.d.ts`
- `capabilities/ralph/definition.md`
- `capabilities/ralph/skills/prd-creation/SKILL.md`
- `capabilities/ralph/skills/ralph-orchestration/SKILL.md`
- `capabilities/ralph/rules/prd-structure.md`
- `capabilities/ralph/rules/iteration-workflow.md`
- `capabilities/ralph/docs/agent-prompt.md`
- `capabilities/ralph/docs/spec-template.md`

### Files to Modify

- `packages/cli/src/app.ts` - Add ralph command
- `packages/cli/src/commands/ralph.ts` - New file with subcommands
- `packages/core/src/capability/index.ts` - Export sync hook support
- `packages/core/src/capability/sync.ts` - New file for sync hooks

---

## Dependencies

- US-001 through US-037 must be complete (core OmniDev infrastructure)
- Capability loader must discover Ralph capability
- CLI framework must support subcommands

---

## Non-Goals

- Parallel story execution (future enhancement)
- Web UI for Ralph (CLI only)
- Integration with external task trackers (Jira, Linear)
- Automatic spec generation from user input (manual creation for now)

