# Provider Adapters

## Overview

OmniDev uses a **Provider Adapter** architecture to support multiple AI coding tools while keeping the core system provider-agnostic. This allows you to:

- Use OmniDev with any supported AI tool (Cursor, Claude Code, Codex, OpenCode)
- Switch between tools without reconfiguring capabilities
- Enable multiple tools simultaneously
- Keep provider preferences local (not committed to git)

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                          Core                                │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐      │
│  │  Capability │───▶│ SyncBundle  │───▶│  Adapters   │      │
│  │   Registry  │    │  (agnostic) │    │             │      │
│  └─────────────┘    └─────────────┘    └─────────────┘      │
└─────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
     ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
     │ Claude Code │  │   Cursor    │  │    Codex    │
     │   Adapter   │  │   Adapter   │  │   Adapter   │
     └─────────────┘  └─────────────┘  └─────────────┘
              │               │               │
              ▼               ▼               ▼
     ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
     │ CLAUDE.md   │  │  .cursor/   │  │ AGENTS.md   │
     │ .claude/    │  │   rules/    │  │             │
     └─────────────┘  └─────────────┘  └─────────────┘
```

### How It Works

1. **Core builds a SyncBundle** - A provider-agnostic bundle containing all capabilities, skills, rules, docs, commands, and subagents.

2. **Adapters materialize the bundle** - Each enabled adapter receives the bundle and writes provider-specific files to disk.

3. **Provider state is local** - Enabled providers are stored in `.omni/state/providers.json`, which is gitignored. This allows team members to use different tools.

## Supported Providers

| Provider | ID | Files Written | Description |
|----------|-----|---------------|-------------|
| Claude Code | `claude-code` | `CLAUDE.md`, `.claude/skills/` | The Claude CLI tool |
| Cursor | `cursor` | `.cursor/rules/` | Cursor IDE |
| Codex | `codex` | `AGENTS.md` | GitHub Codex |
| OpenCode | `opencode` | `.opencode/instructions.md` | Open-source alternative |

## CLI Commands

### List Providers

```bash
omnidev provider list
```

Shows all available providers and their enabled status:

```
Available providers:

  ● Claude Code (claude-code)
  ○ Cursor (cursor)
  ○ Codex (codex)
  ○ OpenCode (opencode)

Legend: ● enabled, ○ disabled
```

### Enable a Provider

```bash
omnidev provider enable <provider-id>
```

Example:
```bash
omnidev provider enable cursor
```

This:
1. Adds the provider to your local state
2. Runs sync to write provider-specific files

### Disable a Provider

```bash
omnidev provider disable <provider-id>
```

Example:
```bash
omnidev provider disable codex
```

## Initialization

When you run `omnidev init`, you can specify which providers to enable:

```bash
# Enable a single provider
omnidev init claude-code

# Enable multiple providers
omnidev init claude-code,cursor

# Legacy shorthand (maps to claude-code and cursor)
omnidev init both
```

If you don't specify a provider, you'll be prompted to select from a list.

## Provider State

Provider preferences are stored in `.omni/state/providers.json`:

```json
{
  "enabled": ["claude-code", "cursor"]
}
```

This file is:
- **Gitignored** - Not committed to version control
- **User-specific** - Each team member can use different tools
- **Managed by CLI** - Use `omnidev provider` commands to modify

## What Each Adapter Writes

### Claude Code (`claude-code`)

**Init:**
- Creates `CLAUDE.md` with import reference to `.omni/instructions.md`

**Sync:**
- Writes skills to `.claude/skills/<skill-name>/SKILL.md`

### Cursor (`cursor`)

**Init:**
- Creates `.cursor/rules/` directory

**Sync:**
- Writes rules to `.cursor/rules/omnidev-<rule-name>.mdc`

### Codex (`codex`)

**Init:**
- Creates `AGENTS.md` with import reference to `.omni/instructions.md`

**Sync:**
- No additional files (uses AGENTS.md import)

### OpenCode (`opencode`)

**Init:**
- Creates `.opencode/instructions.md` with import reference

**Sync:**
- No additional files (uses instructions.md import)

## Provider-Agnostic Files

Regardless of which providers are enabled, OmniDev always writes these files:

| File | Description |
|------|-------------|
| `.omni/instructions.md` | Aggregated rules and docs from all capabilities |
| `.omni/.gitignore` | Capability-specific ignore patterns |
| `.omni/state/manifest.json` | Resource tracking for cleanup |
| `.mcp.json` | MCP server configurations |

## Developing Custom Adapters

The adapter interface is defined in `@omnidev-ai/core`:

```typescript
interface ProviderAdapter {
  id: ProviderId;
  displayName: string;

  // Called during `omnidev init`
  init?(ctx: ProviderContext): Promise<ProviderInitResult>;

  // Called during `omnidev sync`
  sync(bundle: SyncBundle, ctx: ProviderContext): Promise<ProviderSyncResult>;

  // Called when provider is disabled or resources are stale
  cleanup?(manifest: ProviderManifest, ctx: ProviderContext): Promise<void>;
}
```

### SyncBundle Contents

```typescript
interface SyncBundle {
  capabilities: LoadedCapability[];
  skills: Skill[];
  rules: Rule[];
  docs: Doc[];
  commands: Command[];
  subagents: Subagent[];
  instructionsPath: string;      // .omni/instructions.md
  instructionsContent: string;   // Generated content
}
```

### Example Adapter

```typescript
import type {
  ProviderAdapter,
  ProviderContext,
  ProviderSyncResult,
  SyncBundle,
} from "@omnidev-ai/core";

export const myAdapter: ProviderAdapter = {
  id: "my-tool",
  displayName: "My Tool",

  async init(ctx) {
    // Create initial files
    return { filesCreated: ["MY_TOOL.md"] };
  },

  async sync(bundle, ctx) {
    const filesWritten: string[] = [];

    // Write skills
    for (const skill of bundle.skills) {
      // ... write to appropriate location
      filesWritten.push(`my-tool/skills/${skill.name}.md`);
    }

    return { filesWritten, filesDeleted: [] };
  },
};
```

## FAQ

### Q: Can I use multiple providers at once?

Yes! Enable multiple providers and they'll all receive the sync bundle:

```bash
omnidev provider enable claude-code
omnidev provider enable cursor
```

### Q: What happens if two providers write the same file?

Each adapter writes to its own provider-specific directories, so conflicts are unlikely. The manifest system tracks which files belong to which provider.

### Q: How do I migrate from one provider to another?

1. Enable the new provider: `omnidev provider enable <new>`
2. Run sync: `omnidev sync`
3. Optionally disable the old provider: `omnidev provider disable <old>`

### Q: Why are provider preferences local?

Different team members may use different AI tools. Keeping this setting local allows:
- Team members to use their preferred tool
- CI/CD to enable specific providers for automation
- No conflicts in committed configuration

### Q: How do I set default providers for a new project?

The `omnidev init` command prompts for provider selection or accepts them as arguments:

```bash
# For teams standardizing on Claude Code
omnidev init claude-code

# For teams using multiple tools
omnidev init claude-code,cursor,codex
```

