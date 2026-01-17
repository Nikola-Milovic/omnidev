import { mkdirSync } from "node:fs";
import { join } from "node:path";
import type {
	ProviderAdapter,
	ProviderContext,
	ProviderInitResult,
	ProviderSyncResult,
	SyncBundle,
} from "@omnidev-ai/core";

/**
 * Cursor adapter - writes rules to .cursor/rules/
 */
export const cursorAdapter: ProviderAdapter = {
	id: "cursor",
	displayName: "Cursor",

	async init(ctx: ProviderContext): Promise<ProviderInitResult> {
		const rulesDir = join(ctx.projectRoot, ".cursor", "rules");
		mkdirSync(rulesDir, { recursive: true });

		return {
			filesCreated: [".cursor/rules/"],
			message: "Created .cursor/rules/ directory",
		};
	},

	async sync(bundle: SyncBundle, ctx: ProviderContext): Promise<ProviderSyncResult> {
		const filesWritten: string[] = [];
		const filesDeleted: string[] = [];

		const rulesDir = join(ctx.projectRoot, ".cursor", "rules");
		mkdirSync(rulesDir, { recursive: true });

		// Write rules to .cursor/rules/
		for (const rule of bundle.rules) {
			const rulePath = join(rulesDir, `omnidev-${rule.name}.mdc`);
			await Bun.write(rulePath, rule.content);
			filesWritten.push(`.cursor/rules/omnidev-${rule.name}.mdc`);
		}

		return {
			filesWritten,
			filesDeleted,
		};
	},
};
