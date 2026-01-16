# Dynamic Capability Loading Specification

## Summary

This spec describes a **structured export** approach for capabilities to extend OmniDev with all their features:

- **Structured export**: Capabilities export a single default object containing all their exports
- **Unified interface**: CLI commands, MCP tools, docs, rules, skills, gitignore all in one place
- **Type-safe**: Well-defined TypeScript interface for capability exports
- **Auto-discovery**: System inspects enabled capabilities' exports on invocation

## Problem Statement

Currently, capability CLI commands are hardcoded in `packages/cli/src/app.ts`. When a new capability is enabled that provides CLI commands, the user must manually import and register those commands in the CLI app code. This violates the principle of dynamic, capability-driven architecture.

## Requirements

### Functional Requirements

**FR-1: Dynamic Command Discovery**
- When `omnidev` CLI is invoked, it MUST discover all enabled capabilities for the active profile
- It MUST inspect each capability's exports from `index.ts`
- It MUST automatically register any exports ending with `Routes` as CLI commands

**FR-2: No Hardcoded Capability Commands**
- Core OmniDev commands (init, doctor, serve, sync, capability, profile) remain hardcoded
- ALL capability commands MUST be loaded dynamically
- No capability-specific imports in `packages/cli/src/app.ts`

**FR-3: Profile-Aware Loading**
- CLI commands MUST reflect the currently active profile's enabled capabilities
- Switching profiles and running CLI should show different commands based on that profile's capabilities
- If no `.omni/config.toml` exists (not initialized), only core commands are available

**FR-4: Performance**
- Dynamic loading MUST happen on every CLI invocation to reflect current state
- Loading time should remain acceptable (<500ms overhead for typical setups)

**FR-5: Error Handling**
- If a capability declares CLI commands but fails to export them, show a clear error
- If capability loading fails, show which capability failed and why
- CLI should remain functional even if some capability commands fail to load

### Non-Functional Requirements

**NFR-1: Maintainability**
- The solution should be clean and follow existing OmniDev patterns
- Future capabilities should "just work" without modifying CLI code

**NFR-2: Type Safety**
- TypeScript types should be preserved for capability commands
- Build-time type checking where possible

## Current Architecture

### Capability Export Structure

Capabilities export a **default structured object** from their `index.ts`:

```typescript
// capabilities/ralph/index.ts
import { ralphRoutes } from "./cli.js";
import { sync } from "./sync.js";
import type { CapabilityExport } from "@omnidev-ai/core";

// Default export: Structured capability interface
export default {
  // CLI commands
  cliCommands: {
    ralph: ralphRoutes
  },

  // MCP tools (if any)
  mcpTools: {
    // ...
  },

  // Programmatic docs (OPTIONAL - can also use static docs/ directory)
  docs: [
    {
      title: "Ralph Overview",
      content: "# Ralph\n\nRalph is an AI orchestrator..."
    }
  ],

  // Programmatic rules (OPTIONAL - can also use static rules/ directory)
  rules: [
    "# Orchestration Rules\n\nWhen working with PRDs..."
  ],

  // Programmatic skills (OPTIONAL - can also use static skills/ directory)
  skills: [
    {
      skillMd: `---
name: prd
description: "Create and manage PRDs"
---

# PRD Skill

Create product requirement documents...`,
      references: [
        {
          name: "template.md",
          content: "# PRD Template\n\n## Overview..."
        }
      ],
      additionalFiles: [
        {
          name: "example.json",
          content: JSON.stringify({ example: "data" }, null, 2)
        }
      ]
    }
  ],

  // Gitignore patterns
  gitignore: [
    "ralph/",
    "*.ralph.log"
  ],

  // Sync hook
  sync
} satisfies CapabilityExport;

// Named exports for programmatic usage (optional)
export { loadRalphConfig, runAgent, runOrchestration } from "./orchestrator.js";
export * from "./state.js";
```

**Two Ways to Provide Content:**

1. **Static files** (traditional):
   ```
   capabilities/ralph/
   ├── docs/overview.md
   ├── rules/orchestration.md
   └── skills/prd/SKILL.md
   ```

2. **Programmatic exports** (dynamic):
   ```typescript
   export default {
     docs: [{ title: "...", content: "..." }],
     rules: ["# Rule content..."],
     skills: [{ skillMd: "...", references: [...] }]
   };
   ```

**Both approaches are supported!** The sync system will:
- Scan for static files in the capability directory
- Merge with programmatic exports from index.ts
- Create the final output files

### Current CLI App Structure

**packages/cli/src/app.ts:**
```typescript
import { buildApplication, buildRouteMap } from "@stricli/core";

// Core commands (always available)
import { doctorCommand } from "./commands/doctor";
import { initCommand } from "./commands/init";
// ... etc

const app = buildApplication(
  buildRouteMap({
    routes: {
      init: initCommand,
      doctor: doctorCommand,
      // ... core commands
    },
  })
);

export { app };
```

**packages/cli/src/index.ts:**
```typescript
#!/usr/bin/env node
import { run } from "@stricli/core";
import { app } from "./app";

await run(app, process.argv.slice(2));
```

## Proposed Solution

### Architecture Overview

```
CLI Invocation
    ↓
index.ts (async main)
    ↓
buildDynamicApp() - NEW
    ↓
├─ Load core commands (sync)
├─ Check if .omni/ exists
├─ If exists:
│   ├─ Load config → get active profile
│   ├─ Build capability registry → get enabled capabilities
│   ├─ For each capability with [capability.cli]:
│   │   ├─ Get command names from capability.toml
│   │   ├─ Get export names from capability.toml
│   │   ├─ Dynamic import: import(`${capabilityPath}/index.js`)
│   │   └─ Extract command exports
│   └─ Merge capability commands with core commands
└─ Build final stricli app with all routes
    ↓
run(app, args)
```

### Implementation Plan

#### 1. Create and Export Type Definitions

**Created:** `packages/core/src/types/capability-export.ts`

This file contains all the TypeScript interfaces that capability developers will use:
- `CapabilityExport` - Main capability export interface
- `SkillExport` - Skill definition structure
- `DocExport` - Documentation structure
- `FileContent` - File name and content pair
- `McpToolExport` - MCP tool definition

**Exported from:** `packages/core/src/types/index.ts`
```typescript
export * from "./capability-export.js";
```

**Available to capability developers:**
```typescript
import type {
  CapabilityExport,
  SkillExport,
  DocExport,
  FileContent,
  McpToolExport
} from "@omnidev-ai/core";
```

The main package index (`packages/core/src/index.ts`) already re-exports everything from `./types`, so these types are automatically available to any package that imports from `@omnidev-ai/core`.

#### 2. Define Capability Export Interface (Implementation Details)

**packages/core/src/types/capability-export.ts:**
```typescript
import type { Command } from "@stricli/core";

/**
 * File content structure for programmatic file creation
 */
export interface FileContent {
  /** File name (relative path within capability) */
  name: string;

  /** File content */
  content: string;
}

/**
 * Documentation export structure
 */
export interface DocExport {
  /** Document title */
  title: string;

  /** Markdown content */
  content: string;
}

/**
 * Skill export structure
 */
export interface SkillExport {
  /** SKILL.md content (markdown with YAML frontmatter) */
  skillMd: string;

  /** Optional: Reference files to create (files the skill needs access to) */
  references?: FileContent[];

  /** Optional: Additional files to create (templates, examples, etc.) */
  additionalFiles?: FileContent[];
}

/**
 * MCP Tool export structure
 */
export interface McpToolExport {
  name: string;
  description: string;
  // ... MCP tool schema
  [key: string]: unknown;
}

/**
 * Complete capability export structure
 *
 * Capabilities export this as their default export from index.ts.
 * All content fields are OPTIONAL and PROGRAMMATIC.
 * Capabilities can also provide content via static files in their directory.
 * Both approaches are supported and will be merged during sync.
 */
export interface CapabilityExport {
  /** CLI commands provided by this capability */
  cliCommands?: Record<string, Command>;

  /** MCP tools provided by this capability */
  mcpTools?: Record<string, McpToolExport>;

  /** Documentation (programmatic - optional, can also use docs/ directory) */
  docs?: DocExport[];

  /** Rules (programmatic - optional, can also use rules/ directory) */
  rules?: string[];  // Array of markdown content

  /** Skills (programmatic - optional, can also use skills/ directory) */
  skills?: SkillExport[];

  /** Gitignore patterns */
  gitignore?: string[];

  /** Custom sync hook function */
  sync?: () => Promise<void>;

  /** Additional exports for extensibility */
  [key: string]: unknown;
}
```

**packages/core/src/types/index.ts:**
```typescript
export * from "./capability-export.js";
// ... existing exports
```

#### 2. Create Dynamic App Builder

**packages/cli/src/lib/dynamic-app.ts:**
```typescript
import { buildApplication, buildRouteMap } from "@stricli/core";
import type { Command } from "@stricli/core";
import { existsSync } from "node:fs";
import { join } from "node:path";

// Core commands
import { doctorCommand } from "../commands/doctor";
import { initCommand } from "../commands/init";
import { serveCommand } from "../commands/serve";
import { syncCommand } from "../commands/sync";
import { capabilityRoutes } from "../commands/capability";
import { profileRoutes } from "../commands/profile";

/**
 * Build CLI app with dynamically loaded capability commands
 */
export async function buildDynamicApp() {
  // Start with core commands
  const routes: Record<string, Command> = {
    init: initCommand,
    doctor: doctorCommand,
    serve: serveCommand,
    sync: syncCommand,
    capability: capabilityRoutes,
    profile: profileRoutes,
  };

  // Only load capability commands if initialized
  if (existsSync(".omni/config.toml")) {
    try {
      const capabilityCommands = await loadCapabilityCommands();
      Object.assign(routes, capabilityCommands);
    } catch (error) {
      console.warn("Warning: Failed to load capability commands:", error);
      // Continue with core commands only
    }
  }

  return buildApplication(
    buildRouteMap({
      routes,
      docs: {
        brief: "OmniDev commands",
      },
    }),
    {
      name: "omnidev",
      versionInfo: {
        currentVersion: "0.1.0",
      },
    }
  );
}

/**
 * Load CLI commands from enabled capabilities
 */
async function loadCapabilityCommands(): Promise<Record<string, Command>> {
  const { buildCapabilityRegistry } = await import("@omnidev-ai/core");

  const registry = await buildCapabilityRegistry();
  const capabilities = registry.getAllCapabilities();

  const commands: Record<string, Command> = {};

  for (const capability of capabilities) {
    try {
      const capabilityExport = await loadCapabilityExport(capability);

      // Extract CLI commands from structured export
      if (capabilityExport?.cliCommands) {
        for (const [commandName, command] of Object.entries(capabilityExport.cliCommands)) {
          if (commands[commandName]) {
            console.warn(
              `Command '${commandName}' from capability '${capability.id}' conflicts with existing command. Using '${capability.id}' version.`
            );
          }
          commands[commandName] = command;
        }
      }
    } catch (error) {
      console.error(
        `Failed to load capability '${capability.id}':`,
        error
      );
      // Continue loading other capabilities
    }
  }

  return commands;
}

/**
 * Load the default export from a capability
 */
async function loadCapabilityExport(
  capability: Capability
): Promise<CapabilityExport | null> {
  const capabilityPath = join(process.cwd(), capability.path);
  const indexPath = join(capabilityPath, "index.js");

  if (!existsSync(indexPath)) {
    // No index.js means no exports, skip silently
    return null;
  }

  const module = await import(indexPath);

  // Get default export (structured capability export)
  if (!module.default) {
    // Capability has no default export, skip silently
    return null;
  }

  return module.default as CapabilityExport;
}
```

#### 3. Update CLI Entry Point

**packages/cli/src/index.ts:**
```typescript
#!/usr/bin/env node
import { run } from "@stricli/core";
import { buildDynamicApp } from "./lib/dynamic-app";

// Build app dynamically based on enabled capabilities
const app = await buildDynamicApp();

// Run CLI
await run(app, process.argv.slice(2));
```

#### 4. Remove Hardcoded app.ts

Delete or archive `packages/cli/src/app.ts` since it's replaced by dynamic loading.

#### 5. Update Ralph Capability

Move `/packages/cli/src/commands/ralph.ts` → `/capabilities/ralph/cli.ts`:

```typescript
// capabilities/ralph/cli.ts
import { buildRouteMap } from "@stricli/core";
// ... all the Ralph command implementations

export const ralphRoutes = buildRouteMap({
  routes: {
    init: initCommand,
    start: startCommand,
    // ... etc
  },
  docs: {
    brief: "Ralph AI orchestrator commands",
  },
});
```

Then export from `capabilities/ralph/index.ts`:
```typescript
// State management
export * from "./state.js";

// Sync hook
export { sync } from "./sync.js";

// Orchestrator
export { loadRalphConfig, runAgent, runOrchestration } from "./orchestrator.js";

// CLI commands - exported with "Routes" suffix for auto-discovery
export { ralphRoutes } from "./cli.js";
```

**That's it!** No capability.toml changes needed. The CLI loader will automatically discover `ralphRoutes` and register it as the `ralph` command.

### 6. Update Sync System

The sync system needs to handle **both static files and programmatic exports**:

**packages/core/src/sync.ts:**
```typescript
export async function syncAgentConfiguration(options?: { silent?: boolean }): Promise<void> {
  const registry = await buildCapabilityRegistry();
  const capabilities = registry.getAllCapabilities();

  const allDocs: DocExport[] = [];
  const allRules: string[] = [];
  const allSkills: SkillExport[] = [];
  const allGitignorePatterns: string[] = [];
  const syncHooks: Array<() => Promise<void>> = [];

  for (const capability of capabilities) {
    const capabilityExport = await loadCapabilityExport(capability);

    // 1. Scan static files in capability directory
    const staticContent = await scanStaticContent(capability.path);

    // 2. Merge static files with programmatic exports
    if (capabilityExport) {
      // Docs: merge static docs/*.md with programmatic docs
      allDocs.push(...staticContent.docs);
      if (capabilityExport.docs) {
        allDocs.push(...capabilityExport.docs);
      }

      // Rules: merge static rules/*.md with programmatic rules
      allRules.push(...staticContent.rules);
      if (capabilityExport.rules) {
        allRules.push(...capabilityExport.rules);
      }

      // Skills: merge static skills/**/SKILL.md with programmatic skills
      allSkills.push(...staticContent.skills);
      if (capabilityExport.skills) {
        allSkills.push(...capabilityExport.skills);
      }

      // Gitignore: only from programmatic export (not in static files)
      if (capabilityExport.gitignore) {
        allGitignorePatterns.push(...capabilityExport.gitignore);
      }

      // Sync hook: only from programmatic export
      if (capabilityExport.sync) {
        syncHooks.push(capabilityExport.sync);
      }
    } else {
      // No programmatic export, use only static content
      allDocs.push(...staticContent.docs);
      allRules.push(...staticContent.rules);
      allSkills.push(...staticContent.skills);
    }
  }

  // Execute sync hooks
  for (const syncHook of syncHooks) {
    await syncHook();
  }

  // Update .omni/.gitignore
  await rebuildGitignore(allGitignorePatterns);

  // Update .omni/instructions.md (from rules)
  await writeRules(allRules);

  // Update .claude/skills/ (from skills)
  await writeSkills(allSkills);

  // Update .cursor/rules/ (from rules)
  await writeCursorRules(allRules);

  // Write docs somewhere (TBD: where do docs go?)
  await writeDocs(allDocs);

  if (!options?.silent) {
    console.log("✓ Synced:");
    console.log(`  - .omni/.gitignore (${allGitignorePatterns.length} patterns)`);
    console.log(`  - .omni/instructions.md (${allRules.length} rules)`);
    console.log(`  - .claude/skills/ (${allSkills.length} skills)`);
    console.log(`  - docs (${allDocs.length} documents)`);
  }
}

/**
 * Scan capability directory for static content files
 */
async function scanStaticContent(capabilityPath: string): Promise<{
  docs: DocExport[];
  rules: string[];
  skills: SkillExport[];
}> {
  const docs: DocExport[] = [];
  const rules: string[] = [];
  const skills: SkillExport[] = [];

  // Scan docs/*.md
  const docsDir = join(capabilityPath, "docs");
  if (existsSync(docsDir)) {
    const docFiles = readdirSync(docsDir).filter(f => f.endsWith(".md"));
    for (const file of docFiles) {
      const content = await Bun.file(join(docsDir, file)).text();
      docs.push({
        title: file.replace(".md", ""),
        content
      });
    }
  }

  // Scan rules/*.md
  const rulesDir = join(capabilityPath, "rules");
  if (existsSync(rulesDir)) {
    const ruleFiles = readdirSync(rulesDir).filter(f => f.endsWith(".md"));
    for (const file of ruleFiles) {
      const content = await Bun.file(join(rulesDir, file)).text();
      rules.push(content);
    }
  }

  // Scan skills/**/SKILL.md
  const skillsDir = join(capabilityPath, "skills");
  if (existsSync(skillsDir)) {
    const skillDirs = readdirSync(skillsDir, { withFileTypes: true })
      .filter(d => d.isDirectory());

    for (const skillDir of skillDirs) {
      const skillMdPath = join(skillsDir, skillDir.name, "SKILL.md");
      if (existsSync(skillMdPath)) {
        const skillMd = await Bun.file(skillMdPath).text();

        // Optionally scan for reference files in the skill directory
        const references: FileContent[] = [];
        const skillPath = join(skillsDir, skillDir.name);
        const files = readdirSync(skillPath);

        for (const file of files) {
          if (file !== "SKILL.md") {
            const content = await Bun.file(join(skillPath, file)).text();
            references.push({ name: file, content });
          }
        }

        skills.push({
          skillMd,
          references: references.length > 0 ? references : undefined
        });
      }
    }
  }

  return { docs, rules, skills };
}
```

This way:
- **Static files** work as they always have (easy to edit, version control friendly)
- **Programmatic exports** allow dynamic generation (config-based, templates, etc.)
- **Both** are merged together seamlessly

## Example User Flow

### Scenario 1: Fresh Project
```bash
$ omnidev --help
# Shows: init, doctor, capability, profile (core commands only)

$ omnidev init
# Creates .omni/

$ omnidev capability enable ralph
# Adds ralph to active profile, triggers sync

$ omnidev --help
# Shows: init, doctor, serve, sync, capability, profile, ralph
# ↑ ralph appeared automatically!

$ omnidev ralph --help
# Shows Ralph subcommands
```

### Scenario 2: Different Profiles
```bash
$ omnidev profile set planning
# Switches to planning profile (maybe has different capabilities)

$ omnidev --help
# Shows different commands based on planning profile's capabilities
```

### Scenario 3: Capability with Multiple Commands

**index.ts:**
```typescript
import { taskRoutes } from "./task-cli.js";
import { workflowRoutes } from "./workflow-cli.js";

export default {
  cliCommands: {
    task: taskRoutes,
    workflow: workflowRoutes
  }
};
```

```bash
$ omnidev --help
# Shows both 'task' and 'workflow' commands automatically
```

## Edge Cases & Error Handling

### Case 1: Capability Missing Export
```bash
$ omnidev --help
Warning: Failed to load command 'ralph' from capability 'ralph':
  Capability ralph does not export 'ralphRoutes' for command 'ralph'
# Continue showing other commands
```

### Case 2: Capability Import Fails
```bash
$ omnidev --help
Warning: Failed to load capability commands:
  Error importing capability 'ralph': SyntaxError...
# Continue with core commands only
```

### Case 3: Not Initialized
```bash
$ omnidev --help
# Shows core commands only (no .omni/ directory)
```

### Case 4: Command Name Conflict
If two capabilities declare the same command name, the second one wins (with a warning):
```bash
Warning: Command 'deploy' from capability 'heroku' conflicts with 'vercel'. Using 'heroku'.
```

## Testing Strategy

### Unit Tests
- Test `loadCapabilityCommands()` with mock capabilities
- Test `loadCapabilityCommand()` with various export configurations
- Test error handling for missing exports

### Integration Tests
- Test full CLI flow with enabled/disabled capabilities
- Test profile switching
- Test command availability after enable/disable
- Test error scenarios

### Manual Testing Checklist
- [ ] Fresh init shows core commands only
- [ ] Enable capability → command appears
- [ ] Disable capability → command disappears
- [ ] Switch profile → commands update
- [ ] Invalid capability export → graceful error
- [ ] Multiple commands from one capability work
- [ ] Help output is correct

## Performance Considerations

**Estimated Overhead:**
- Config load: ~5ms
- Capability registry build: ~50ms (10 capabilities)
- Dynamic imports: ~10ms per capability
- **Total: ~100-150ms** (acceptable)

**Optimization Opportunities:**
- Cache capability registry (invalidate on config change)
- Lazy-load command implementations (only when invoked)
- Parallel dynamic imports

## Migration Guide

### For OmniDev Core
1. Implement `buildDynamicApp()` in `packages/cli/src/lib/dynamic-app.ts`
2. Update `packages/cli/src/index.ts` to use dynamic app builder
3. Remove/archive `packages/cli/src/app.ts`

### For Ralph Capability
1. Move `packages/cli/src/commands/ralph.ts` → `capabilities/ralph/cli.ts`
2. Update `capabilities/ralph/index.ts` to export structured default object:
   ```typescript
   export default {
     cliCommands: { ralph: ralphRoutes },
     rules: ["rules/orchestration.md"],
     skills: [{ skillMd: "skills/prd/SKILL.md" }],
     gitignore: ["ralph/", "*.ralph.log"],
     sync
   };
   ```
3. That's it!

### For Future Capabilities
When creating a capability:
1. Create your capability features (CLI commands, rules, skills, etc.)
2. Export them from `index.ts` as a structured default export following `CapabilityExport` interface
3. Everything will be automatically discovered and loaded!

## Open Questions

1. **Command conflicts**: How to handle two capabilities declaring same command?
   - **Decision**: Last one wins with a warning showing which capability is being used
   - Alternative: Error and abort, require user to disable one

2. **Skills structure**: Need to design the complete `SkillExport` structure
   - What metadata fields are needed?
   - How to handle skill references and additional files?
   - How to support skill templates and examples?

3. **MCP Tools structure**: Need to define `McpToolExport` interface
   - Follow MCP protocol specification
   - Support tool schemas, input/output types

4. **Docs export**: Should docs be file paths or inline content?
   - **Current**: File paths (relative to capability root)
   - Alternative: Allow both paths and inline markdown strings

## Documentation Requirements

### Create Capability Development Guide

**docs/capability-development.md** (or product.md):

This guide should document the complete `CapabilityExport` interface and how to create capabilities.

**Contents:**
1. **Overview**: What is a capability and how does it extend OmniDev
2. **Capability Structure**: Directory layout and required files
3. **Export Interface**: Complete documentation of `CapabilityExport`
   - `cliCommands`: How to create CLI commands with stricli
   - `mcpTools`: How to define MCP tools
   - `docs`: Documentation file conventions
   - `rules`: Rule file format and usage
   - `skills`: Skill structure, metadata, references
   - `gitignore`: Patterns to exclude from version control
   - `sync`: Custom sync hook function
4. **Examples**: Complete examples for each export type
5. **Best Practices**: Naming conventions, file organization, testing
6. **Migration Guide**: Converting existing capabilities to new structure

This documentation is **critical** for capability developers to understand the interface contract.

## Success Criteria

✅ No capability imports in `packages/cli/src/app.ts` (or file deleted)
✅ Ralph commands appear after enabling ralph capability
✅ Commands disappear after disabling capability
✅ Different profiles show different commands
✅ Clear error messages when capability exports are invalid
✅ Performance overhead < 500ms
✅ Future capabilities can add features without modifying core code
✅ `CapabilityExport` interface is well-documented in capability development guide
✅ All sync operations (rules, skills, gitignore, etc.) use structured export
