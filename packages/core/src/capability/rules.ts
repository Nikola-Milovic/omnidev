import { existsSync, readdirSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { basename, join } from "node:path";
import type { Rule } from "../types";

/**
 * Load rules from a capability's rules/ directory
 * @param capabilityPath Path to the capability directory
 * @param capabilityId ID of the capability
 * @returns Array of Rule objects
 */
export async function loadRules(capabilityPath: string, capabilityId: string): Promise<Rule[]> {
	const rulesDir = join(capabilityPath, "rules");

	if (!existsSync(rulesDir)) {
		return [];
	}

	const rules: Rule[] = [];
	const entries = readdirSync(rulesDir, { withFileTypes: true }).sort((a, b) =>
		a.name.localeCompare(b.name),
	);

	for (const entry of entries) {
		if (entry.isFile() && entry.name.endsWith(".md")) {
			const rulePath = join(rulesDir, entry.name);
			const content = await readFile(rulePath, "utf-8");

			rules.push({
				name: basename(entry.name, ".md"),
				content: content.trim(),
				capabilityId,
			});
		}
	}

	return rules;
}
