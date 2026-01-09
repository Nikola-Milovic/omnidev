/**
 * Ralph Prompt Generator
 *
 * Generates agent prompts from PRD context for orchestration.
 */

import type { PRD, Story } from "./types.d.ts";
import { getPatterns, getProgress } from "./state.ts";

/**
 * Generates a prompt for the agent based on PRD and current story.
 */
export async function generatePrompt(prd: PRD, story: Story, prdName: string): Promise<string> {
	// Load progress and patterns
	const progressContent = await getProgress(prdName);
	const patterns = await getPatterns(prdName);

	// Format acceptance criteria
	const criteriaLines = story.acceptanceCriteria.map((c) => `  - ${c}`).join("\n");

	// Format patterns
	const patternsText = patterns.length > 0 ? patterns.map((p) => `- ${p}`).join("\n") : "None yet";

	// Get last 20 lines of progress for summary
	const progressLines = progressContent.split("\n");
	const recentProgress = progressLines.slice(-20).join("\n");

	return `# Ralph Agent Instructions

You are an autonomous coding agent working on the ${prd.name} project.

${prd.description}

## Your Task

1. Read the PRD at \`.omni/ralph/prds/${prdName}/prd.json\`
2. Read the progress log at \`.omni/ralph/prds/${prdName}/progress.txt\` (check Codebase Patterns section first)
3. Check you're on the correct branch from PRD \`branchName\`. If not, check it out or create from main.
4. Pick the **highest priority** user story where \`passes: false\`
5. **Read the linked task file** (\`taskFile\` field) for full context - this contains:
   - Detailed requirements and system behaviors
   - Technical implementation details
   - Code examples and patterns
   - Touchpoints (files to create/modify)
   - Acceptance criteria
6. Implement the story's \`scope\` (may be full task or a specific section)
7. Run quality checks: \`bun run check\` (runs typecheck + lint + format:check)
8. Run tests: \`bun test\`
9. If checks pass, commit ALL changes with message: \`feat: [Story ID] - [Story Title]\`
10. Update the PRD to set \`passes: true\` for the completed story
11. Append your progress to \`.omni/ralph/prds/${prdName}/progress.txt\`

## Critical: Read the Task File!

The PRD story is just an overview. The \`taskFile\` contains the real requirements:
- **Introduction**: What needs to be done and why
- **Goals**: What we're trying to achieve
- **User Stories**: Detailed acceptance criteria
- **Functional Requirements**: Specific behaviors
- **Technical Considerations**: Code examples and patterns
- **Touchpoints**: Files you'll need to create/modify
- **Dependencies**: What needs to exist first

The \`scope\` field tells you which part of the task to implement in this story.

## Progress Report Format

APPEND to \`.omni/ralph/prds/${prdName}/progress.txt\` (never replace, always append):

\`\`\`
## [Date/Time] - [Story ID]
- What was implemented
- Files changed
- **Learnings for future iterations:**
  - Patterns discovered
  - Gotchas encountered
---
\`\`\`

## Consolidate Patterns

If you discover a **reusable pattern**, add it to \`## Codebase Patterns\` at the TOP of progress.txt:

\`\`\`
## Codebase Patterns
- Example: Use \`Bun.file().text()\` for async file reading
- Example: Always use \`existsSync\` from 'fs' for file checks
\`\`\`

## Running Commands

\`\`\`bash
# Quality checks (run before every commit)
bun run typecheck     # TypeScript check
bun run lint          # Biome lint check
bun run format:check  # Biome format check
bun run check         # All of the above

# Auto-fix
bun run format        # Fix formatting
bun run lint:fix      # Fix lint issues

# Testing
bun test              # Run all tests
bun test --coverage   # Run with coverage report

# Installing dependencies
bun install           # Install all workspace dependencies
bun add <pkg>         # Add to current package
bun add -d <pkg>      # Add as dev dependency
\`\`\`

## Technology Stack

- **Runtime**: Bun (not Node.js)
- **Language**: TypeScript (strict mode)
- **Packages**: ESM only (\`"type": "module"\`)
- **Monorepo**: Bun workspaces
- **Linting**: Biome
- **Testing**: Bun's built-in test runner
- **CLI**: Stricli
- **MCP**: @modelcontextprotocol/sdk

## Stop Condition

After completing a user story, check if ALL stories have \`passes: true\`.

If ALL stories are complete, reply with:
<promise>COMPLETE</promise>

If there are still stories with \`passes: false\`, end your response normally.

## Important

- Work on ONE story per iteration
- **Always read the task file first** - it has the details you need
- Use \`bun\` not \`npm\`, \`yarn\`, or \`pnpm\`
- Commit frequently with descriptive messages
- Keep quality checks green
- Do NOT use type escape hatches (\`any\`, \`as unknown\`) - use proper types
- Run \`bun install\` after creating package.json files
- Aim for 70%+ test coverage on new code

## Current Story

**${story.id}: ${story.title}**
- Task File: ${story.specFile}
- Scope: ${story.scope}
- Acceptance Criteria:
${criteriaLines}

## Recent Progress

${recentProgress}

## Codebase Patterns

${patternsText}
`;
}
