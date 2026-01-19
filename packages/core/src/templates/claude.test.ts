import { describe, expect, test } from "bun:test";
import { generateClaudeTemplate } from "./claude";

describe("generateClaudeTemplate", () => {
	test("generates CLAUDE.md template with OmniDev section", () => {
		const template = generateClaudeTemplate();

		expect(template).toContain("# Project Instructions");
		expect(template).toContain("## OmniDev");
	});

	test("includes placeholder for project-specific instructions", () => {
		const template = generateClaudeTemplate();

		expect(template).toContain("<!-- Add your project-specific instructions here -->");
	});

	test("includes comment about sync population", () => {
		const template = generateClaudeTemplate();

		expect(template).toContain(
			"<!-- This section is populated during sync with capability rules and docs -->",
		);
	});
});
