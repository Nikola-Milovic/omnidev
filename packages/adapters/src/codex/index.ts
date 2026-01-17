import { existsSync } from "node:fs";
import { join } from "node:path";
import type {
	ProviderAdapter,
	ProviderContext,
	ProviderInitResult,
	ProviderSyncResult,
	SyncBundle,
} from "@omnidev-ai/core";

/**
 * Codex adapter - writes AGENTS.md
 */
export const codexAdapter: ProviderAdapter = {
	id: "codex",
	displayName: "Codex",

	async init(ctx: ProviderContext): Promise<ProviderInitResult> {
		const agentsMdPath = join(ctx.projectRoot, "AGENTS.md");
		const filesCreated: string[] = [];

		if (!existsSync(agentsMdPath)) {
			await Bun.write(agentsMdPath, generateAgentsTemplate());
			filesCreated.push("AGENTS.md");
		}

		return {
			filesCreated,
			message:
				filesCreated.length > 0 ? `Created ${filesCreated.join(", ")}` : "AGENTS.md already exists",
		};
	},

	async sync(_bundle: SyncBundle, _ctx: ProviderContext): Promise<ProviderSyncResult> {
		// Codex primarily uses AGENTS.md which imports .omni/instructions.md
		// No additional file writing needed during sync
		return {
			filesWritten: [],
			filesDeleted: [],
		};
	},
};

function generateAgentsTemplate(): string {
	return `# Project Instructions

<!-- Add your project-specific instructions here -->

## OmniDev

@import .omni/instructions.md
`;
}
