import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import type { Subagent, SubagentHooks, SubagentModel, SubagentPermissionMode } from "../types";
import { parseFrontmatterWithMarkdown } from "./yaml-parser";

interface SubagentFrontmatter {
	name: string;
	description: string;
	tools?: string;
	disallowedTools?: string;
	model?: SubagentModel;
	permissionMode?: SubagentPermissionMode;
	skills?: string;
	hooks?: SubagentHooks;
}

/**
 * Load subagents from the subagents/ directory of a capability.
 * Each subagent is a SUBAGENT.md file in its own subdirectory.
 */
export async function loadSubagents(
	capabilityPath: string,
	capabilityId: string,
): Promise<Subagent[]> {
	const subagentsDir = join(capabilityPath, "subagents");

	if (!existsSync(subagentsDir)) {
		return [];
	}

	const subagents: Subagent[] = [];
	const entries = readdirSync(subagentsDir, { withFileTypes: true }).sort((a, b) =>
		a.name.localeCompare(b.name),
	);

	for (const entry of entries) {
		if (entry.isDirectory()) {
			const subagentPath = join(subagentsDir, entry.name, "SUBAGENT.md");
			if (existsSync(subagentPath)) {
				const subagent = await parseSubagentFile(subagentPath, capabilityId);
				subagents.push(subagent);
			}
		}
	}

	return subagents;
}

async function parseSubagentFile(filePath: string, capabilityId: string): Promise<Subagent> {
	const content = await Bun.file(filePath).text();

	const parsed = parseFrontmatterWithMarkdown<SubagentFrontmatter>(content);

	if (!parsed) {
		throw new Error(`Invalid SUBAGENT.md format at ${filePath}: missing YAML frontmatter`);
	}

	const frontmatter = parsed.frontmatter;
	const systemPrompt = parsed.markdown;

	if (!frontmatter.name || !frontmatter.description) {
		throw new Error(`Invalid SUBAGENT.md at ${filePath}: name and description required`);
	}

	const result: Subagent = {
		name: frontmatter.name,
		description: frontmatter.description,
		systemPrompt: systemPrompt.trim(),
		capabilityId,
	};

	// Add optional fields if present
	if (frontmatter.tools) {
		result.tools = parseCommaSeparatedList(frontmatter.tools);
	}

	if (frontmatter.disallowedTools) {
		result.disallowedTools = parseCommaSeparatedList(frontmatter.disallowedTools);
	}

	if (frontmatter.model) {
		result.model = frontmatter.model;
	}

	if (frontmatter.permissionMode) {
		result.permissionMode = frontmatter.permissionMode;
	}

	if (frontmatter.skills) {
		result.skills = parseCommaSeparatedList(frontmatter.skills);
	}

	if (frontmatter.hooks) {
		result.hooks = frontmatter.hooks;
	}

	return result;
}

function parseCommaSeparatedList(value: string): string[] {
	return value
		.split(",")
		.map((item) => item.trim())
		.filter(Boolean);
}
