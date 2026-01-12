import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import type { Command } from "../types";

interface CommandFrontmatter {
	name: string;
	description: string;
	allowedTools?: string;
}

/**
 * Load commands from the commands/ directory of a capability.
 * Each command is a COMMAND.md file in its own subdirectory.
 */
export async function loadCommands(
	capabilityPath: string,
	capabilityId: string,
): Promise<Command[]> {
	const commandsDir = join(capabilityPath, "commands");

	if (!existsSync(commandsDir)) {
		return [];
	}

	const commands: Command[] = [];
	const entries = readdirSync(commandsDir, { withFileTypes: true });

	for (const entry of entries) {
		if (entry.isDirectory()) {
			const commandPath = join(commandsDir, entry.name, "COMMAND.md");
			if (existsSync(commandPath)) {
				const command = await parseCommandFile(commandPath, capabilityId);
				commands.push(command);
			}
		}
	}

	return commands;
}

async function parseCommandFile(filePath: string, capabilityId: string): Promise<Command> {
	const content = await Bun.file(filePath).text();

	// Parse YAML frontmatter
	const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);

	if (!frontmatterMatch) {
		throw new Error(`Invalid COMMAND.md format at ${filePath}: missing YAML frontmatter`);
	}

	const yamlStr = frontmatterMatch[1];
	const prompt = frontmatterMatch[2];

	if (!yamlStr || prompt === undefined) {
		throw new Error(`Invalid COMMAND.md format at ${filePath}: missing YAML or markdown content`);
	}

	const frontmatter = parseYamlFrontmatter(yamlStr);

	if (!frontmatter.name || !frontmatter.description) {
		throw new Error(`Invalid COMMAND.md at ${filePath}: name and description required`);
	}

	const result: Command = {
		name: frontmatter.name,
		description: frontmatter.description,
		prompt: prompt.trim(),
		capabilityId,
	};

	// Add optional fields if present
	if (frontmatter.allowedTools) {
		result.allowedTools = frontmatter.allowedTools;
	}

	return result;
}

function parseYamlFrontmatter(yaml: string): CommandFrontmatter {
	const result: Record<string, string> = {};

	for (const line of yaml.split("\n")) {
		// Simple key-value parsing (handles kebab-case keys)
		const match = line.match(/^([\w-]+):\s*"?([^"]*)"?\s*$/);
		if (match) {
			const key = match[1];
			const value = match[2];
			if (key && value !== undefined) {
				// Convert kebab-case to camelCase
				const camelKey = key.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
				result[camelKey] = value;
			}
		}
	}

	return result as unknown as CommandFrontmatter;
}
