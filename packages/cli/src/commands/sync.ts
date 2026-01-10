import { buildCommand } from "@stricli/core";
import { syncAgentConfiguration } from "@omnidev/core";

export const syncCommand = buildCommand({
	docs: {
		brief: "Manually sync all capabilities, roles, instructions, and MCP configuration",
	},
	parameters: {},
	async func() {
		return await runSync();
	},
});

export async function runSync(): Promise<void> {
	console.log("Syncing OmniDev configuration...");
	console.log("");

	try {
		await syncAgentConfiguration({ silent: false });

		console.log("");
		console.log("✓ Sync completed successfully!");
		console.log("");
		console.log("Synced components:");
		console.log("  • Capability registry");
		console.log("  • Capability sync hooks");
		console.log("  • .omni/.gitignore");
		console.log("  • .omni/instructions.md");
		console.log("  • .claude/skills/");
		console.log("  • .cursor/rules/");
	} catch (error) {
		console.error("");
		console.error("✗ Sync failed:");
		console.error(`  ${error instanceof Error ? error.message : String(error)}`);
		process.exit(1);
	}
}
