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

<!-- BEGIN OMNIDEV GENERATED CONTENT - DO NOT EDIT BELOW THIS LINE -->
<!-- This section is automatically updated by 'omnidev agents sync' -->

## Capabilities

No capabilities enabled yet. Run \`omnidev capability enable <name>\` to enable capabilities.

<!-- END OMNIDEV GENERATED CONTENT -->
`;
}
