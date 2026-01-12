import type { CapabilityExport, SubagentExport } from "@omnidev/core";

/**
 * UI Skills capability - provides subagents for common development tasks.
 *
 * This capability demonstrates two approaches for defining subagents:
 *
 * 1. **Static files** (in subagents/ directory):
 *    - subagents/code-reviewer/SUBAGENT.md
 *    - subagents/test-runner/SUBAGENT.md
 *    - subagents/db-reader/SUBAGENT.md
 *
 * 2. **Programmatic exports** (below):
 *    - Useful for dynamic generation or complex configurations
 *    - Takes precedence over static files if both are present
 *
 * Static files are loaded automatically. Programmatic exports are useful when:
 * - You need to generate subagent prompts dynamically
 * - You want to include complex hook configurations
 * - You need to share logic between multiple subagents
 */

// Example of a programmatically defined subagent
// This shows how to create subagents with full control over configuration
const researcherSubagent: SubagentExport = {
	subagentMd: `---
name: researcher
description: Deep research agent for exploring codebases and answering questions. Use for understanding code architecture, finding patterns, and documenting systems.
tools: Read, Glob, Grep, WebFetch, WebSearch
model: sonnet
permissionMode: plan
---

You are a research specialist focused on understanding and documenting codebases.

## Research Process

1. **Scope Definition** - Clarify what needs to be researched
2. **Exploration** - Use Glob/Grep to find relevant files
3. **Analysis** - Read and understand the code
4. **Synthesis** - Compile findings into clear documentation

## Output Format

Structure your findings as:

### Overview
High-level summary of what you found.

### Key Components
- Component A: Description and purpose
- Component B: Description and purpose

### Architecture
How components interact and data flows.

### Recommendations
Suggestions for improvements or areas needing attention.

## Best Practices

- Read files thoroughly before drawing conclusions
- Follow imports/exports to understand dependencies
- Document assumptions and uncertainties
- Provide file paths for all referenced code
`,
};

export default {
	// Subagents can be exported programmatically
	// Note: The capability also has static subagents in subagents/ directory
	// which are loaded automatically (code-reviewer, test-runner, db-reader)
	// Uncomment below to add programmatic subagents:
	// subagents: [researcherSubagent],
} satisfies CapabilityExport;

// Re-export for potential external use
export { researcherSubagent };
