/**
 * Template for CLAUDE.md (Claude provider)
 * Creates a minimal file with reference to OmniDev instructions
 */
export function generateClaudeTemplate(): string {
	return `# Project Instructions

<!-- Add your project-specific instructions here -->

## OmniDev

@import .omni/instructions.md
`;
}

/**
 * Template for .omni/instructions.md
 * Contains OmniDev-specific instructions and capability rules
 */
export function generateInstructionsTemplate(): string {
	return `# OmniDev Instructions

## Project Description
<!-- TODO: Add 2-3 sentences describing your project -->
[Describe what this project does and its main purpose]

## How OmniDev Works

OmniDev provides **three MCP tools** that give you programmatic access to capabilities:

### \`omni_query\` - Search and Discovery

Search across enabled capabilities, documentation, skills, and rules.

\`\`\`json
{
  "query": "search query"  // Empty query returns summary of enabled capabilities
}
\`\`\`

Returns short snippets with source tags. Use for finding relevant capabilities and documentation.

### \`omni_sandbox_environment\` - Tool Introspection

Discover available sandbox tools with three levels of detail:

\`\`\`json
// Level 1: Overview of all modules
{}

// Level 2: Module details with schemas
{ "capability": "my-capability" }

// Level 3: Full tool specification
{ "capability": "my-capability", "tool": "myTool" }
\`\`\`

Use this to discover what tools are available and how to call them.

### \`omni_execute\` - Programmatic Execution

Execute TypeScript code in a sandboxed environment with access to all enabled capabilities.

\`\`\`json
{
  "code": "full contents of main.ts file"
}
\`\`\`

Write complete TypeScript programs that import capability modules:

\`\`\`typescript
import * as myCapability from 'my-capability';
import * as fs from 'fs';

export async function main(): Promise<number> {
  // Your code here
  console.log('Hello from OmniDev sandbox!');

  return 0; // Success
}
\`\`\`

**Response includes:**
- \`stdout\` - Standard output
- \`stderr\` - Standard error
- \`exit_code\` - Exit code (0 = success)
- \`changed_files\` - List of files modified
- \`diff_stat\` - Summary of changes

## The Sandbox

The sandbox is a TypeScript execution environment located in \`.omni/sandbox/\`. It provides:

1. **Isolated Execution** - Code runs in a controlled environment
2. **Capability Access** - Import enabled capabilities as TypeScript modules
3. **File System Access** - Read and write files in the project
4. **Type Safety** - Full TypeScript support with IntelliSense

**Key features:**
- Runs using Bun runtime for speed
- Auto-generated module wrappers for MCP capabilities
- Direct symlinks to native capability code
- All capability tools are available as typed functions

**Example workflow:**
1. Use \`omni_query\` (empty query) to see what capabilities are enabled
2. Use \`omni_sandbox_environment\` to discover available tools and their schemas
3. Use \`omni_sandbox_environment\` with capability + tool params for detailed specs
4. Write TypeScript code that imports and uses capability tools
5. Execute with \`omni_execute\`

<!-- BEGIN OMNIDEV GENERATED CONTENT - DO NOT EDIT BELOW THIS LINE -->
<!-- This section is automatically updated by 'omnidev agents sync' -->

## Capabilities

No capabilities enabled yet. Run \`omnidev capability enable <name>\` to enable capabilities.

<!-- END OMNIDEV GENERATED CONTENT -->
`;
}
