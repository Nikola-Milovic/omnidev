import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import type { Skill } from "../types";
import { parseFrontmatterWithMarkdown } from "./yaml-parser";

interface SkillFrontmatter {
	name: string;
	description: string;
}

export async function loadSkills(capabilityPath: string, capabilityId: string): Promise<Skill[]> {
	const skillsDir = join(capabilityPath, "skills");

	if (!existsSync(skillsDir)) {
		return [];
	}

	const skills: Skill[] = [];
	const entries = readdirSync(skillsDir, { withFileTypes: true });

	for (const entry of entries) {
		if (entry.isDirectory()) {
			const skillPath = join(skillsDir, entry.name, "SKILL.md");
			if (existsSync(skillPath)) {
				const skill = await parseSkillFile(skillPath, capabilityId);
				skills.push(skill);
			}
		}
	}

	return skills;
}

async function parseSkillFile(filePath: string, capabilityId: string): Promise<Skill> {
	const content = await Bun.file(filePath).text();

	const parsed = parseFrontmatterWithMarkdown<SkillFrontmatter>(content);

	if (!parsed) {
		throw new Error(`Invalid SKILL.md format at ${filePath}: missing YAML frontmatter`);
	}

	const frontmatter = parsed.frontmatter;
	const instructions = parsed.markdown;

	if (!frontmatter.name || !frontmatter.description) {
		throw new Error(`Invalid SKILL.md at ${filePath}: name and description required`);
	}

	return {
		name: frontmatter.name,
		description: frontmatter.description,
		instructions: instructions.trim(),
		capabilityId,
	};
}
