---
name: ralph
description: "Work on a Ralph PRD iteration. Triggers on: work on prd, continue ralph, next story, ralph iteration."
---

# Ralph Orchestration Workflow

Execute PRD-driven development workflow by implementing one user story per iteration.

## The Job

You are an autonomous coding agent working on a Ralph-managed PRD. Follow this workflow:

### 1. Read Context

**Check the progress log first:**
```bash
# Read the progress log to understand patterns and recent work
cat .omni/ralph/prds/<prd-name>/progress.txt
```

**Important sections:**
- **Codebase Patterns**: Reusable patterns discovered in previous iterations
- **Progress Log**: Recent work, files changed, and learnings

### 2. Verify Branch

Check you're on the correct branch specified in the PRD:
```bash
git branch --show-current
```

If not on the right branch, either check it out or create it from main:
```bash
git checkout <branch-name>
# OR
git checkout -b <branch-name> main
```

### 3. Pick Next Story

Read the PRD to find the highest priority story where `passes: false`:
```bash
cat .omni/ralph/prds/<prd-name>/prd.json
```

Look for the story with the lowest `priority` number that has `passes: false`.

### 4. Read the Spec File

**CRITICAL**: The PRD story is just an overview. Read the full spec file for implementation details:
```bash
cat .omni/ralph/prds/<prd-name>/specs/<spec-file>
```

The spec contains:
- **Introduction**: What needs to be done and why
- **Goals**: What we're trying to achieve
- **Functional Requirements**: Specific behaviors
- **Technical Considerations**: Code examples and patterns
- **Touchpoints**: Files to create/modify
- **Dependencies**: What needs to exist first

Pay attention to the story's `scope` field - it tells you which part of the spec to implement.

### 5. Implement the Story

Follow the spec's requirements:
- Create or modify files listed in **Touchpoints**
- Follow patterns from **Technical Considerations**
- Use codebase patterns from progress.txt
- Implement ONLY what's in the story's `scope`

### 6. Run Quality Checks

Before committing, ensure all checks pass:
```bash
bun run check      # Runs typecheck + lint + format:check
bun test           # Run tests
```

Fix any issues before proceeding.

### 7. Commit Changes

When all checks pass, commit with the standard format:
```bash
git add .
git commit -m "feat: [<story-id>] - <story-title>"
```

Example: `feat: [US-001] - Set up authentication database schema`

### 8. Update PRD

Mark the story as passed in the PRD:
```json
{
  "id": "US-001",
  "passes": true  // Changed from false to true
}
```

Save the updated PRD to `.omni/ralph/prds/<prd-name>/prd.json`.

### 9. Append Progress

Add an entry to the progress log:
```markdown
## [Date/Time] - <story-id>
- Brief description of what was implemented
- Files changed: file1.ts, file2.ts, file3.ts
- **Learnings for future iterations:**
  - Pattern or gotcha discovered
  - Approach that worked well
  - Avoid this mistake
---
```

Append this to `.omni/ralph/prds/<prd-name>/progress.txt`.

### 10. Check for Completion

After updating the PRD, check if ALL stories have `passes: true`.

If ALL stories are complete, reply with:
```
<promise>COMPLETE</promise>
```

Otherwise, end your response normally. Ralph will spawn the next iteration.

## Key Principles

- **Work on ONE story per iteration**: Never implement multiple stories at once
- **Read the spec first**: The story title is just a summary - the spec has the details
- **Follow the scope**: Only implement what's in the story's `scope` field
- **Keep checks green**: Never commit failing tests or lint errors
- **Document learnings**: Help future iterations by adding patterns to progress.txt
- **No type escape hatches**: Don't use `any` or `as unknown` - use proper types

## Example Iteration

```
User: Continue working on the Ralph PRD