# Command Development Guide

Slash commands allow you to define frequently used prompts as Markdown files that Claude Code can execute. Commands are defined per-capability and support argument placeholders, bash execution, and file references.

## Quick Start

Create a command by adding a `COMMAND.md` file in your capability's `commands/` directory:

```
capabilities/
└── my-capability/
    ├── capability.toml
    └── commands/
        └── my-command/
            └── COMMAND.md
```

### Basic COMMAND.md Structure

```markdown
---
name: my-command
description: What this command does
allowed-tools: Bash(git add:*), Bash(git commit:*)
---

Your prompt here with support for:
- $ARGUMENTS (all arguments)
- $1, $2, $3 (specific arguments)
- !`bash commands` (executed before command runs)
- @file.js (file references)
```

## Frontmatter Fields

| Field | Required | Description |
|-------|----------|-------------|
| `name` | Yes | Command name (used as `/command-name`) |
| `description` | Yes | Brief description of what this command does |
| `allowed-tools` | No | Tools specification (e.g., `Bash(git add:*), Bash(git status:*)`) |

**Note**: Use either `allowed-tools` (kebab-case) or `allowedTools` (camelCase) - both are supported.

## Command Features

### Argument Placeholders

**All arguments with $ARGUMENTS**

```markdown
---
name: fix-issue
description: Fix a GitHub issue
---

Fix issue #$ARGUMENTS following our coding standards.
```

Usage: `/fix-issue 123` → `$ARGUMENTS` becomes `"123"`

**Individual arguments with $1, $2, etc.**

```markdown
---
name: review-pr
description: Review a pull request
---

Review PR #$1 with priority $2 and assign to $3.
```

Usage: `/review-pr 456 high alice` → `$1` = `"456"`, `$2` = `"high"`, `$3` = `"alice"`

### Bash Command Execution

Execute bash commands before the command runs using the `!` prefix:

```markdown
---
name: git-commit
description: Create a git commit
allowed-tools: Bash(git add:*), Bash(git status:*), Bash(git commit:*)
---

## Context

- Current status: !`git status`
- Current branch: !`git branch --show-current`
- Recent commits: !`git log --oneline -10`

## Your Task

Create a git commit based on the above changes.
```

The output of these bash commands is included in the command context.

### File References

Include file contents using the `@` prefix:

```markdown
---
name: review-file
description: Review a file
---

Review the implementation in @src/utils/helpers.js and suggest improvements.
```

### Allowed Tools

Specify which bash commands the command can execute:

```markdown
---
name: run-tests
description: Run tests
allowed-tools: Bash(npm test:*), Bash(bun test:*), Bash(pytest:*)
---

Run the test suite and report results.
```

Format: `Bash(command:pattern)` where:
- `command` is the base command (git, npm, pytest, etc.)
- `pattern` uses `*` as wildcard (e.g., `git add:*` allows all `git add` variations)

## Writing Effective Commands

### Structure

1. **Frontmatter**: Define name, description, and allowed tools
2. **Context Section**: Provide necessary information (git status, file contents, etc.)
3. **Task Section**: Clear instructions on what to do
4. **Output Format**: Specify how results should be presented

### Example: Comprehensive Command

```markdown
---
name: fix-issue
description: Fix a GitHub issue following coding standards
allowed-tools: Bash(git add:*), Bash(git status:*), Bash(git commit:*), Bash(git diff:*)
---

Fix issue #$ARGUMENTS following the project's coding standards.

## Context

- Issue number: #$ARGUMENTS
- Current branch: !`git branch --show-current`
- Current status: !`git status`
- Current diff: !`git diff HEAD`

## Your Task

1. Review the issue details (use gh CLI if available)
2. Implement the fix with proper error handling
3. Write tests for the fix
4. Run existing tests to ensure nothing breaks
5. Create a descriptive commit message

## Commit Format

```
fix: <brief description> (#$ARGUMENTS)

<detailed explanation of the fix>

Closes #$ARGUMENTS
```

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

## Programmatic Commands

For dynamic or complex configurations, export commands from `index.ts`:

```typescript
import type { CapabilityExport, CommandExport } from "@omnidev/core";

const optimizeCommand: CommandExport = {
  commandMd: `---
name: optimize
description: Analyze code for performance issues
allowed-tools: Bash(node --prof:*), Bash(python -m cProfile:*)
---

Analyze $ARGUMENTS for performance issues and suggest optimizations.

## Analysis Steps

1. Profile the code
2. Identify bottlenecks
3. Suggest optimizations
`
};

export default {
  commands: [optimizeCommand]
} satisfies CapabilityExport;
```

Programmatic exports take precedence over static `COMMAND.md` files.

## Best Practices

### 1. Clear Descriptions
Write descriptions that help users understand when to use the command:

**Good**: `"Fix a GitHub issue following project coding standards"`
**Bad**: `"Fix issue"`

### 2. Use Context Wisely
Provide necessary context but don't overload:

```markdown
## Context

- Current status: !`git status`
- Recent commits: !`git log --oneline -5`
```

### 3. Specify Allowed Tools
Always specify allowed tools for bash execution:

```markdown
allowed-tools: Bash(git add:*), Bash(git commit:*), Bash(git push:*)
```

### 4. Structured Output
Specify how results should be formatted:

```markdown
## Output Format

### Summary
- Files changed: X
- Tests passing: X/Y

### Details
[Detailed information...]
```

### 5. Handle Arguments Gracefully
Provide clear usage when arguments are missing:

```markdown
---
name: review-pr
description: Review PR #[number] with priority [high|medium|low]
---

Review PR #$1 with priority $2.

Usage: /review-pr <pr-number> <priority>
```

## Common Patterns

### Git Workflow Command

```markdown
---
name: git-workflow
description: Complete git workflow (add, commit, push)
allowed-tools: Bash(git add:*), Bash(git commit:*), Bash(git push:*)
---

## Current State

- Status: !`git status`
- Branch: !`git branch --show-current`

## Task

1. Stage all changes
2. Create a commit with message: $ARGUMENTS
3. Push to remote
```

### Test Runner Command

```markdown
---
name: test
description: Run tests and report results
allowed-tools: Bash(npm test:*), Bash(bun test:*), Bash(pytest:*)
---

Run tests and provide detailed results.

## Report Format

### Summary
- Total: X
- Passed: X (✓)
- Failed: X (✗)

### Failed Tests
[Details for each failure]
```

### Code Review Command

```markdown
---
name: review
description: Review code changes
allowed-tools: Bash(git diff:*)
---

Review the following changes:

!`git diff HEAD`

## Review Checklist
- [ ] Code quality
- [ ] Security
- [ ] Tests
- [ ] Documentation
```

## Debugging Commands

1. **Test command arguments**: Use simple echo commands to verify argument parsing
2. **Check bash execution**: Ensure bash commands in `!` blocks work correctly
3. **Verify file references**: Make sure `@file` references resolve correctly
4. **Review allowed tools**: Confirm allowed-tools patterns match your needs

## Reloading Commands

Commands are loaded at session start. After creating or modifying a command:
- Restart your session, OR
- Use `/commands` command to reload immediately (if available)

## See Also

- [Subagent Development Guide](./subagent-development.md)
- [Skills Development](./skills-development.md)
- [Capability Development Guide](./capability-development.md)
