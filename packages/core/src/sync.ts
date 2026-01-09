import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { buildCapabilityRegistry } from "./capability/registry";
import { writeRules } from "./capability/rules";
import { rebuildGitignore } from "./gitignore/manager";

/**
 * Central sync function that regenerates all agent configuration files
 * Called automatically after any config change (init, capability enable/disable, profile change)
 */
export async function syncAgentConfiguration(options?: { silent?: boolean }): Promise<void> {
	const silent = options?.silent ?? false;

	if (!silent) {
		console.log("Syncing agent configuration...");
	}

	const registry = await buildCapabilityRegistry();
	const capabilities = registry.getAllCapabilities();
	const skills = registry.getAllSkills();
	const rules = registry.getAllRules();

	// Rebuild .omni/.gitignore with all enabled capability patterns
	const gitignorePatterns = new Map<string, string[]>();
	for (const capability of capabilities) {
		if (capability.gitignore && capability.gitignore.length > 0) {
			gitignorePatterns.set(capability.id, capability.gitignore);
		}
	}
	await rebuildGitignore(gitignorePatterns);

	// Call sync hooks for capabilities that have them
	for (const capability of capabilities) {
		if (capability.config.sync?.on_sync) {
			const syncFnName = capability.config.sync.on_sync;
			const syncFn = capability.exports[syncFnName];

			if (typeof syncFn === "function") {
				try {
					await syncFn();
				} catch (error) {
					console.error(`Error running sync hook for ${capability.id}:`, error);
				}
			}
		}
	}

	// Ensure directories exist
	mkdirSync(".claude/skills", { recursive: true });
	mkdirSync(".cursor/rules", { recursive: true });

	// Write rules to .omni/instructions.md
	await writeRules(rules);

	// Write skills to .claude/skills/
	for (const skill of skills) {
		const skillDir = `.claude/skills/${skill.name}`;
		mkdirSync(skillDir, { recursive: true });
		await Bun.write(
			join(skillDir, "SKILL.md"),
			`---
name: ${skill.name}
description: "${skill.description}"
---

${skill.instructions}`,
		);
	}

	// Write rules to .cursor/rules/
	for (const rule of rules) {
		await Bun.write(`.cursor/rules/omnidev-${rule.name}.mdc`, rule.content);
	}

	if (!silent) {
		console.log("✓ Synced:");
		console.log("  - .omni/.gitignore (capability patterns)");
		console.log("  - .omni/instructions.md (capability rules)");
		console.log(`  - .claude/skills/ (${skills.length} skills)`);
		console.log(`  - .cursor/rules/ (${rules.length} rules)`);
	}
}
