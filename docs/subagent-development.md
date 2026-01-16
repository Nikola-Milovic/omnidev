# Subagent Development Guide

Subagents are specialized AI agents that Claude can delegate tasks to. They provide focused capabilities with custom system prompts, tool restrictions, and permission configurations.

## Quick Start

Create a subagent by adding a `SUBAGENT.md` file in your capability's `subagents/` directory:

```
capabilities/
└── my-capability/
    ├── capability.toml
    └── subagents/
        └── my-subagent/
            └── SUBAGENT.md
```

### Basic SUBAGENT.md Structure

```markdown
---
name: my-subagent
description: What this subagent does and when to use it
tools: Read, Glob, Grep
model: sonnet
---

You are a specialized agent for [task description].

[System prompt instructions...]
```

## Frontmatter Fields

| Field | Required | Description |
|-------|----------|-------------|
| `name` | Yes | Unique identifier using lowercase letters and hyphens |
| `description` | Yes | When Claude should delegate to this subagent |
| `tools` | No | Comma-separated list of tools. Inherits all if omitted |
| `disallowedTools` | No | Tools to deny (removed from inherited/specified list) |
| `model` | No | Model: `sonnet`, `opus`, `haiku`, or `inherit`. Default: `sonnet` |
| `permissionMode` | No | `default`, `acceptEdits`, `dontAsk`, `bypassPermissions`, or `plan` |
| `skills` | No | Skills to load into the subagent's context at startup |
| `hooks` | No | Lifecycle hooks scoped to this subagent (see Hooks section) |

## Available Tools

Subagents can use any of Claude Code's internal tools:

- **File Operations**: `Read`, `Write`, `Edit`, `Glob`, `Grep`
- **Execution**: `Bash`, `Task`
- **Web**: `WebFetch`, `WebSearch`
- **User Interaction**: `AskUserQuestion`
- **MCP Tools**: Any tools from configured MCP servers

### Restricting Tools

Use `tools` for an allowlist:
```yaml
tools: Read, Glob, Grep
```

Use `disallowedTools` for a denylist:
```yaml
disallowedTools: Write, Edit, Bash
```

## Model Selection

| Model | Best For |
|-------|----------|
| `sonnet` | General purpose, good balance (default) |
| `opus` | Complex reasoning, high-stakes tasks |
| `haiku` | Fast, simple tasks, cost-effective |
| `inherit` | Use the same model as main conversation |

## Permission Modes

| Mode | Behavior |
|------|----------|
| `default` | Standard permission checking with prompts |
| `acceptEdits` | Auto-accept file edits |
| `dontAsk` | Auto-deny prompts (allowed tools still work) |
| `bypassPermissions` | Skip all checks (use with caution) |
| `plan` | Read-only exploration mode |

## Writing Effective System Prompts

### Structure

1. **Role Definition**: Who the agent is
2. **Trigger Conditions**: When to activate
3. **Process Steps**: How to accomplish tasks
4. **Output Format**: How to present results
5. **Constraints**: What NOT to do

### Example: Code Reviewer

```markdown
---
name: code-reviewer
description: Reviews code for quality and best practices
tools: Read, Glob, Grep, Bash
model: inherit
---

You are a senior code reviewer ensuring high standards.

## When Invoked
1. Run git diff to see recent changes
2. Focus on modified files
3. Begin review immediately

## Review Checklist
- Code clarity and readability
- Proper error handling
- Security considerations
- Test coverage

## Output Format
Organize by priority:
- **Critical**: Must fix
- **Warnings**: Should fix
- **Suggestions**: Consider improving
```

## Programmatic Subagents

For dynamic or complex configurations, export subagents from `index.ts`:

```typescript
import type { CapabilityExport, SubagentExport } from "@omnidev-ai/core";

const mySubagent: SubagentExport = {
  subagentMd: `---
name: dynamic-agent
description: Dynamically configured agent
tools: Read, Glob
model: sonnet
---

You are a specialized agent...
`
};

export default {
  subagents: [mySubagent]
} satisfies CapabilityExport;
```

Programmatic exports take precedence over static `SUBAGENT.md` files.

## Hooks

Hooks allow you to run scripts before/after tool usage or when the subagent stops.

### Hook Events

| Event | When It Fires |
|-------|---------------|
| `PreToolUse` | Before the subagent uses a tool |
| `PostToolUse` | After the subagent uses a tool |
| `Stop` | When the subagent finishes |

### Example: Validate Bash Commands

```yaml
---
name: safe-executor
description: Execute commands with validation
tools: Bash
hooks:
  PreToolUse:
    - matcher: "Bash"
      hooks:
        - type: command
          command: "./scripts/validate-command.sh"
---
```

The validation script receives JSON via stdin:
```json
{
  "tool_name": "Bash",
  "tool_input": {
    "command": "rm -rf /"
  }
}
```

Exit codes:
- `0`: Allow the tool call
- `2`: Block the tool call (message shown to user)
- Other: Error handling

## Best Practices

### 1. Focused Purpose
Each subagent should excel at one specific task. Don't create "do everything" agents.

**Good**: `code-reviewer`, `test-runner`, `db-reader`
**Bad**: `general-assistant`, `helper`, `worker`

### 2. Detailed Descriptions
Claude uses the description to decide when to delegate. Be specific:

**Good**: `"Expert code review specialist. Proactively reviews code for quality, security, and maintainability. Use immediately after writing or modifying code."`

**Bad**: `"Reviews code"`

### 3. Least Privilege
Only grant necessary tools and permissions:

```yaml
# Read-only researcher
tools: Read, Glob, Grep
disallowedTools: Write, Edit, Bash

# Safe database access
tools: Bash
permissionMode: dontAsk
```

### 4. Clear Output Format
Specify how results should be presented:

```markdown
## Output Format

### Summary
- Total: X items
- Passed: X
- Failed: X

### Details
[Structured details...]
```

### 5. Include Examples
Show the subagent how to handle common scenarios:

```markdown
## Example

When asked "Review the authentication module":
1. Find auth-related files: `grep -r "auth" src/`
2. Read main auth files
3. Check for common security issues
4. Report findings with file locations
```

## Common Patterns

### Read-Only Research Agent

```yaml
---
name: researcher
description: Deep codebase research and documentation
tools: Read, Glob, Grep
permissionMode: plan
model: sonnet
---
```

### High-Privilege Automation

```yaml
---
name: auto-fixer
description: Automatically fix common issues
tools: Read, Write, Edit, Bash
permissionMode: acceptEdits
model: opus
---
```

### Fast Utility Agent

```yaml
---
name: quick-check
description: Fast checks and validations
tools: Bash, Read
model: haiku
---
```

## Debugging Subagents

1. **Test the system prompt**: Run it manually in Claude to verify behavior
2. **Check tool access**: Ensure required tools are available
3. **Verify hooks**: Test validation scripts independently
4. **Review permissions**: Make sure permissionMode allows required operations

## Reloading Subagents

Subagents are loaded at session start. After creating or modifying a subagent:
- Restart your session, OR
- Use `/agents` command to reload immediately

## See Also

- [Capability Development Guide](./capability-development.md)
- [Skills Development](./skills-development.md)
- [Hooks Configuration](./hooks.md)
