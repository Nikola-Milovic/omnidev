import type { CapabilityExport, CommandExport, SubagentExport } from "@omnidev/core";

/**
 * UI Skills capability - provides subagents and slash commands for common development tasks.
 *
 * This capability demonstrates two approaches for defining content:
 *
 * 1. **Static files** (in directories):
 *    - subagents/code-reviewer/SUBAGENT.md
 *    - subagents/test-runner/SUBAGENT.md
 *    - subagents/db-reader/SUBAGENT.md
 *    - commands/fix-issue/COMMAND.md
 *    - commands/review-pr/COMMAND.md
 *    - commands/run-tests/COMMAND.md
 *
 * 2. **Programmatic exports** (below):
 *    - Useful for dynamic generation or complex configurations
 *    - Takes precedence over static files if both are present
 *
 * Static files are loaded automatically. Programmatic exports are useful when:
 * - You need to generate content dynamically
 * - You want to include complex configurations
 * - You need to share logic between multiple items
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

// Example of a programmatically defined command
// This shows how to create commands with full control over configuration
const optimizeCommand: CommandExport = {
	commandMd: `---
name: optimize
description: Analyze code for performance issues and suggest optimizations
allowed-tools: Bash(node --prof:*), Bash(python -m cProfile:*)
---

Analyze $ARGUMENTS for performance issues and suggest optimizations.

## Analysis Steps

1. **Profile the code**: Run performance profiling tools
2. **Identify bottlenecks**: Look for:
   - Inefficient algorithms (O(n²) or worse)
   - Unnecessary loops or iterations
   - Memory leaks
   - Blocking I/O operations
   - Unoptimized database queries

3. **Suggest optimizations**:
   - Algorithm improvements
   - Caching strategies
   - Lazy loading
   - Batch processing
   - Parallel execution

## Output Format

### Performance Issues Found
- Issue: [description]
- Location: @[file:line]
- Current complexity: O(...)
- Impact: High/Medium/Low

### Recommended Optimizations
For each issue:
1. **Optimization**: [what to change]
2. **Expected improvement**: [estimated speedup]
3. **Code example**: [show the optimized version]
4. **Trade-offs**: [any downsides]
`,
};

export default {
	// Subagents and commands can be exported programmatically
	// Note: The capability also has static files in subagents/ and commands/ directories
	// which are loaded automatically
	// Uncomment below to add programmatic exports:
	// subagents: [researcherSubagent],
	// commands: [optimizeCommand],
} satisfies CapabilityExport;

// Re-export for potential external use
export { optimizeCommand, researcherSubagent };
