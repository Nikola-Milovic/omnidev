---
"@omnidev-ai/adapters": minor
"@omnidev-ai/core": minor
---

Add writers for subagents and commands to Claude Code, Cursor, and OpenCode

**Claude Code:**
- `ClaudeAgentsWriter`: writes subagents to `.claude/agents/<name>.md`
- `ClaudeCommandsAsSkillsWriter`: transforms commands into skills at `.claude/skills/<name>/SKILL.md`

**Cursor:**
- `CursorAgentsWriter`: writes subagents to `.cursor/agents/<name>.md` with YAML frontmatter (name, description, model, readonly)
- `CursorCommandsWriter`: writes commands to `.cursor/commands/<name>.md` as plain Markdown

**OpenCode:**
- `OpenCodeAgentsWriter`: writes subagents to `.opencode/agents/<name>.md` with OpenCode-specific format
- `OpenCodeCommandsWriter`: writes commands to `.opencode/commands/<name>.md`

**Type Extensions:**
- Extended `Subagent` type with OpenCode-specific fields: `mode`, `temperature`, `maxSteps`, `hidden`, `toolPermissions`, `permissions`, `modelId`
- Extended `Command` type with OpenCode-specific fields: `agent`, `modelId`

**Automatic Mappings:**
- Model mapping: Claude (sonnet/opus/haiku) → OpenCode (anthropic/claude-*), Cursor (fast/inherit)
- Permission mode mapping: Claude → OpenCode permissions object, Cursor readonly flag
