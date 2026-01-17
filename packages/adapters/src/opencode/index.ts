import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import type {
	ProviderAdapter,
	ProviderContext,
	ProviderInitResult,
	ProviderSyncResult,
	SyncBundle,
} from "@omnidev-ai/core";

/**
 * OpenCode adapter - writes configuration for OpenCode
 */
export const opencodeAdapter: ProviderAdapter = {
	id: "opencode",
	displayName: "OpenCode",

	async init(ctx: ProviderContext): Promise<ProviderInitResult> {
		const opencodeDir = join(ctx.projectRoot, ".opencode");
		mkdirSync(opencodeDir, { recursive: true });

		const instructionsPath = join(opencodeDir, "instructions.md");
		const filesCreated: string[] = [];

		if (!existsSync(instructionsPath)) {
			await Bun.write(instructionsPath, generateOpencodeTemplate());
			filesCreated.push(".opencode/instructions.md");
		}

		return {
			filesCreated,
			message:
				filesCreated.length > 0
					? `Created ${filesCreated.join(", ")}`
					: ".opencode/instructions.md already exists",
		};
	},

	async sync(_bundle: SyncBundle, _ctx: ProviderContext): Promise<ProviderSyncResult> {
		// OpenCode uses its own instructions.md which imports .omni/instructions.md
		// No additional file writing needed during sync
		return {
			filesWritten: [],
			filesDeleted: [],
		};
	},
};

function generateOpencodeTemplate(): string {
	return `# OpenCode Instructions

<!-- Add your project-specific instructions here -->

## OmniDev

@import ../.omni/instructions.md
`;
}
