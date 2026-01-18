import { existsSync, readdirSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { basename, join } from "node:path";
import type { Doc } from "../types";

/**
 * Load documentation from a capability directory
 * Loads both definition.md and all files from docs/ directory
 * @param capabilityPath Path to the capability directory
 * @param capabilityId ID of the capability
 * @returns Array of Doc objects
 */
export async function loadDocs(capabilityPath: string, capabilityId: string): Promise<Doc[]> {
	const docs: Doc[] = [];

	// Load definition.md if exists
	const definitionPath = join(capabilityPath, "definition.md");
	if (existsSync(definitionPath)) {
		const content = await readFile(definitionPath, "utf-8");
		docs.push({
			name: "definition",
			content: content.trim(),
			capabilityId,
		});
	}

	// Load docs/*.md
	const docsDir = join(capabilityPath, "docs");
	if (existsSync(docsDir)) {
		const entries = readdirSync(docsDir, { withFileTypes: true }).sort((a, b) =>
			a.name.localeCompare(b.name),
		);

		for (const entry of entries) {
			if (entry.isFile() && entry.name.endsWith(".md")) {
				const docPath = join(docsDir, entry.name);
				const content = await readFile(docPath, "utf-8");

				docs.push({
					name: basename(entry.name, ".md"),
					content: content.trim(),
					capabilityId,
				});
			}
		}
	}

	return docs;
}
