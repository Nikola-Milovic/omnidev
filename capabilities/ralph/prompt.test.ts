/**
 * Tests for Ralph prompt generator
 */

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { generatePrompt } from "./prompt";
import type { PRD, Story } from "./types.d.ts";
import { createPRD } from "./state";

const TEST_DIR = join(process.cwd(), ".test-ralph-prompt");
const RALPH_DIR = join(TEST_DIR, ".omni/ralph");
const PRDS_DIR = join(RALPH_DIR, "prds");

beforeEach(() => {
	// Create test directory
	mkdirSync(TEST_DIR, { recursive: true });
	process.chdir(TEST_DIR);

	// Create Ralph structure
	mkdirSync(RALPH_DIR, { recursive: true });
	mkdirSync(PRDS_DIR, { recursive: true });
});

afterEach(() => {
	process.chdir(join(TEST_DIR, ".."));
	if (existsSync(TEST_DIR)) {
		rmSync(TEST_DIR, { recursive: true, force: true });
	}
});

describe("generatePrompt", () => {
	test("generates prompt with PRD context", async () => {
		const prd: PRD = {
			name: "test-project",
			branchName: "feature/test",
			description: "Test project description",
			createdAt: "2026-01-09T00:00:00Z",
			userStories: [],
		};

		const story: Story = {
			id: "US-001",
			title: "Test Story",
			specFile: "specs/001-test.md",
			scope: "Implement test feature",
			acceptanceCriteria: ["Feature works", "Tests pass"],
			priority: 1,
			passes: false,
			notes: "",
		};

		// Create PRD to get progress file
		await createPRD("test-project", prd);

		const prompt = await generatePrompt(prd, story, "test-project");

		expect(prompt).toContain("test-project");
		expect(prompt).toContain("Test project description");
		expect(prompt).toContain("US-001");
		expect(prompt).toContain("Test Story");
		expect(prompt).toContain("specs/001-test.md");
		expect(prompt).toContain("Implement test feature");
		expect(prompt).toContain("Feature works");
		expect(prompt).toContain("Tests pass");
	});

	test("includes recent progress", async () => {
		const prd: PRD = {
			name: "progress-test",
			branchName: "main",
			description: "Test",
			createdAt: "2026-01-09T00:00:00Z",
			userStories: [],
		};

		const story: Story = {
			id: "US-002",
			title: "Story",
			specFile: "test.md",
			scope: "Test",
			acceptanceCriteria: [],
			priority: 1,
			passes: false,
			notes: "",
		};

		// Create PRD and add progress
		await createPRD("progress-test", prd);
		const { appendProgress } = await import("./state");
		await appendProgress("progress-test", "## Test Progress\n- Did something");

		const prompt = await generatePrompt(prd, story, "progress-test");

		expect(prompt).toContain("Test Progress");
		expect(prompt).toContain("Did something");
	});

	test("includes codebase patterns", async () => {
		const prd: PRD = {
			name: "patterns-test",
			branchName: "main",
			description: "Test",
			createdAt: "2026-01-09T00:00:00Z",
			userStories: [],
		};

		const story: Story = {
			id: "US-003",
			title: "Story",
			specFile: "test.md",
			scope: "Test",
			acceptanceCriteria: [],
			priority: 1,
			passes: false,
			notes: "",
		};

		// Create PRD and add patterns
		await createPRD("patterns-test", prd);
		const prdDir = join(PRDS_DIR, "patterns-test");
		const progressPath = join(prdDir, "progress.txt");
		await Bun.write(
			progressPath,
			"## Codebase Patterns\n- Use Bun.file()\n- Use strict types\n\n---\n\n## Progress Log\n",
		);

		const prompt = await generatePrompt(prd, story, "patterns-test");

		expect(prompt).toContain("Use Bun.file()");
		expect(prompt).toContain("Use strict types");
	});

	test("handles empty patterns gracefully", async () => {
		const prd: PRD = {
			name: "no-patterns",
			branchName: "main",
			description: "Test",
			createdAt: "2026-01-09T00:00:00Z",
			userStories: [],
		};

		const story: Story = {
			id: "US-004",
			title: "Story",
			specFile: "test.md",
			scope: "Test",
			acceptanceCriteria: [],
			priority: 1,
			passes: false,
			notes: "",
		};

		await createPRD("no-patterns", prd);

		const prompt = await generatePrompt(prd, story, "no-patterns");

		expect(prompt).toContain("None yet");
	});

	test("formats acceptance criteria as bullet list", async () => {
		const prd: PRD = {
			name: "criteria-test",
			branchName: "main",
			description: "Test",
			createdAt: "2026-01-09T00:00:00Z",
			userStories: [],
		};

		const story: Story = {
			id: "US-005",
			title: "Story",
			specFile: "test.md",
			scope: "Test",
			acceptanceCriteria: ["First criterion", "Second criterion"],
			priority: 1,
			passes: false,
			notes: "",
		};

		await createPRD("criteria-test", prd);

		const prompt = await generatePrompt(prd, story, "criteria-test");

		expect(prompt).toContain("  - First criterion");
		expect(prompt).toContain("  - Second criterion");
	});
});
