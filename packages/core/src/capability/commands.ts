import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import type { Command } from "../types";
import { parseFrontmatterWithMarkdown } from "./yaml-parser";

interface CommandFrontmatter {
	name: string;
	description: string;
	allowedTools?: string;
}

/**
 * Load commands from a commands/ directory of a capability.
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
	const parsed = parseFrontmatterWithMarkdown<CommandFrontmatter>(content);

	if (!parsed) {
		throw new Error(`Invalid COMMAND.md format at ${filePath}: missing YAML frontmatter`);
	}

	const frontmatter = parsed.frontmatter;
	const prompt = parsed.markdown;

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
