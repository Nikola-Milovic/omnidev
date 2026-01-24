import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "@omnidev-ai/core/test-utils";
import type { Command, SyncBundle } from "@omnidev-ai/core";
import { CursorCommandsWriter } from "./cursor-commands.js";

describe("CursorCommandsWriter", () => {
	let testDir: string;
	let originalCwd: string;

	beforeEach(() => {
		originalCwd = process.cwd();
		testDir = tmpdir("cursor-commands-writer-");
		process.chdir(testDir);
	});

	afterEach(() => {
		process.chdir(originalCwd);
		if (existsSync(testDir)) {
			rmSync(testDir, { recursive: true, force: true });
		}
	});

	function createBundle(commands: Command[]): SyncBundle {
		return {
			capabilities: [],
			skills: [],
			rules: [],
			docs: [],
			commands,
			subagents: [],
			instructionsContent: "",
		};
	}

	test("has correct id", () => {
		expect(CursorCommandsWriter.id).toBe("cursor-commands");
	});

	test("writes command to output directory", async () => {
		const commands: Command[] = [
			{
				name: "review-pr",
				description: "Review a pull request",
				prompt: "Review the PR at $1",
				capabilityId: "test-cap",
			},
		];
		const bundle = createBundle(commands);

		const result = await CursorCommandsWriter.write(bundle, {
			outputPath: ".cursor/commands/",
			projectRoot: testDir,
		});

		expect(result.filesWritten).toEqual([".cursor/commands/review-pr.md"]);
		expect(existsSync(`${testDir}/.cursor/commands/review-pr.md`)).toBe(true);

		const content = readFileSync(`${testDir}/.cursor/commands/review-pr.md`, "utf-8");
		// Cursor commands are plain markdown with heading
		expect(content).toContain("# review-pr");
		expect(content).toContain("Review a pull request");
		expect(content).toContain("Review the PR at $1");
	});

	test("writes multiple commands", async () => {
		const commands: Command[] = [
			{
				name: "cmd-one",
				description: "First command",
				prompt: "Prompt one",
				capabilityId: "cap-1",
			},
			{
				name: "cmd-two",
				description: "Second command",
				prompt: "Prompt two",
				capabilityId: "cap-2",
			},
		];
		const bundle = createBundle(commands);

		const result = await CursorCommandsWriter.write(bundle, {
			outputPath: ".cursor/commands/",
			projectRoot: testDir,
		});

		expect(result.filesWritten).toHaveLength(2);
		expect(existsSync(`${testDir}/.cursor/commands/cmd-one.md`)).toBe(true);
		expect(existsSync(`${testDir}/.cursor/commands/cmd-two.md`)).toBe(true);
	});

	test("returns empty array when no commands", async () => {
		const bundle = createBundle([]);

		const result = await CursorCommandsWriter.write(bundle, {
			outputPath: ".cursor/commands/",
			projectRoot: testDir,
		});

		expect(result.filesWritten).toEqual([]);
	});

	test("includes description and prompt in content", async () => {
		const commands: Command[] = [
			{
				name: "code-review-checklist",
				description: "Comprehensive checklist for conducting thorough code reviews",
				prompt: "## Review Categories\n\n1. Check for bugs\n2. Check for security issues",
				capabilityId: "test-cap",
			},
		];
		const bundle = createBundle(commands);

		await CursorCommandsWriter.write(bundle, {
			outputPath: ".cursor/commands/",
			projectRoot: testDir,
		});

		const content = readFileSync(`${testDir}/.cursor/commands/code-review-checklist.md`, "utf-8");
		expect(content).toContain("# code-review-checklist");
		expect(content).toContain("Comprehensive checklist for conducting thorough code reviews");
		expect(content).toContain("## Review Categories");
		expect(content).toContain("1. Check for bugs");
	});
});
