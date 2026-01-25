import { mkdirSync } from "node:fs";
import { join } from "node:path";
import type {
	ProviderAdapter,
	ProviderContext,
	ProviderInitResult,
	ProviderSyncResult,
	SyncBundle,
} from "@omnidev-ai/core";
import {
	executeWriters,
	InstructionsMdWriter,
	SkillsWriter,
	type AdapterWriterConfig,
} from "../writers/generic/index.js";
import {
	CursorAgentsWriter,
	CursorCommandsWriter,
	CursorMcpJsonWriter,
	CursorRulesWriter,
} from "../writers/cursor/index.js";

/**
 * Cursor adapter - writes CLAUDE.md, skills, rules, agents, and commands.
 */
export const cursorAdapter: ProviderAdapter & { writers: AdapterWriterConfig[] } = {
	id: "cursor",
	displayName: "Cursor",

	writers: [
		{ writer: InstructionsMdWriter, outputPath: "CLAUDE.md" },
		{ writer: SkillsWriter, outputPath: ".cursor/skills/" },
		{ writer: CursorRulesWriter, outputPath: ".cursor/rules/" },
		{ writer: CursorAgentsWriter, outputPath: ".cursor/agents/" },
		{ writer: CursorCommandsWriter, outputPath: ".cursor/commands/" },
		{ writer: CursorMcpJsonWriter, outputPath: ".cursor/mcp.json" },
	],

	async init(ctx: ProviderContext): Promise<ProviderInitResult> {
		const rulesDir = join(ctx.projectRoot, ".cursor", "rules");
		mkdirSync(rulesDir, { recursive: true });

		return {
			filesCreated: [".cursor/rules/"],
			message: "Created .cursor/rules/ directory",
		};
	},

	async sync(bundle: SyncBundle, ctx: ProviderContext): Promise<ProviderSyncResult> {
		const result = await executeWriters(this.writers, bundle, ctx.projectRoot);

		return {
			filesWritten: result.filesWritten,
			filesDeleted: [],
		};
	},
};
