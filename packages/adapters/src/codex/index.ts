import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type {
	ProviderAdapter,
	ProviderContext,
	ProviderInitResult,
	ProviderSyncResult,
	SyncBundle,
} from "@omnidev-ai/core";

/**
 * Codex adapter - generates AGENTS.md from OMNI.md
 */
export const codexAdapter: ProviderAdapter = {
	id: "codex",
	displayName: "Codex",

	async init(_ctx: ProviderContext): Promise<ProviderInitResult> {
		// AGENTS.md is now generated during sync from OMNI.md
		return {
			filesCreated: [],
			message: "Codex adapter initialized",
		};
	},

	async sync(bundle: SyncBundle, ctx: ProviderContext): Promise<ProviderSyncResult> {
		const filesWritten: string[] = [];
		const filesDeleted: string[] = [];

		// Generate AGENTS.md from OMNI.md + instructions content
		const agentsMdPath = join(ctx.projectRoot, "AGENTS.md");
		const agentsMdContent = await generateAgentsMdContent(
			ctx.projectRoot,
			bundle.instructionsContent,
		);
		await writeFile(agentsMdPath, agentsMdContent, "utf-8");
		filesWritten.push("AGENTS.md");

		return {
			filesWritten,
			filesDeleted,
		};
	},
};

/**
 * Generate AGENTS.md content from OMNI.md with instructions directly embedded
 */
async function generateAgentsMdContent(
	projectRoot: string,
	instructionsContent: string,
): Promise<string> {
	const omniMdPath = join(projectRoot, "OMNI.md");

	let omniMdContent = "";

	if (existsSync(omniMdPath)) {
		omniMdContent = await readFile(omniMdPath, "utf-8");
	}

	// Combine OMNI.md content with instructions directly embedded
	let content = omniMdContent;
	content += `\n\n## OmniDev\n\n${instructionsContent}\n`;

	return content;
}
