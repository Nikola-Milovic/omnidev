import { existsSync, mkdirSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import type {
	ProviderAdapter,
	ProviderContext,
	ProviderInitResult,
	ProviderSyncResult,
	SyncBundle,
} from "@omnidev-ai/core";

/**
 * Claude Code adapter - writes skills to .claude/skills/ and manages CLAUDE.md
 */
export const claudeCodeAdapter: ProviderAdapter = {
	id: "claude-code",
	displayName: "Claude Code",

	async init(ctx: ProviderContext): Promise<ProviderInitResult> {
		const claudeMdPath = join(ctx.projectRoot, "CLAUDE.md");
		const filesCreated: string[] = [];

		if (!existsSync(claudeMdPath)) {
			await writeFile(claudeMdPath, generateClaudeTemplate(), "utf-8");
			filesCreated.push("CLAUDE.md");
		}

		return {
			filesCreated,
			message:
				filesCreated.length > 0 ? `Created ${filesCreated.join(", ")}` : "CLAUDE.md already exists",
		};
	},

	async sync(bundle: SyncBundle, ctx: ProviderContext): Promise<ProviderSyncResult> {
		const filesWritten: string[] = [];
		const filesDeleted: string[] = [];

		const skillsDir = join(ctx.projectRoot, ".claude", "skills");
		mkdirSync(skillsDir, { recursive: true });

		// Write skills to .claude/skills/
		for (const skill of bundle.skills) {
			const skillDir = join(skillsDir, skill.name);
			mkdirSync(skillDir, { recursive: true });

			const skillPath = join(skillDir, "SKILL.md");
			const content = `---
name: ${skill.name}
description: "${skill.description}"
---

${skill.instructions}`;

			await writeFile(skillPath, content, "utf-8");
			filesWritten.push(`.claude/skills/${skill.name}/SKILL.md`);
		}

		return {
			filesWritten,
			filesDeleted,
		};
	},
};

function generateClaudeTemplate(): string {
	return `# Project Instructions

<!-- Add your project-specific instructions here -->

## OmniDev

@import .omni/instructions.md
`;
}
