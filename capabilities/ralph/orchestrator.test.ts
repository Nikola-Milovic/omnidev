/**
 * Tests for Ralph orchestrator
 */

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { loadRalphConfig, runAgent, runOrchestration } from "./orchestrator";
import { createPRD } from "./state";

const TEST_DIR = join(process.cwd(), ".test-ralph-orchestrator");
const RALPH_DIR = join(TEST_DIR, ".omni/ralph");
const CONFIG_PATH = join(RALPH_DIR, "config.toml");
const PRDS_DIR = join(RALPH_DIR, "prds");

const MOCK_CONFIG = `[ralph]
default_agent = "test"
default_iterations = 5
auto_archive = false

[agents.test]
command = "echo"
args = ["test output"]

[agents.claude]
command = "npx"
args = ["-y", "@anthropic-ai/claude-code", "--model", "sonnet", "-p"]
`;

beforeEach(() => {
	// Create test directory
	mkdirSync(TEST_DIR, { recursive: true });
	process.chdir(TEST_DIR);

	// Create Ralph structure
	mkdirSync(RALPH_DIR, { recursive: true });
	mkdirSync(PRDS_DIR, { recursive: true });
	writeFileSync(CONFIG_PATH, MOCK_CONFIG);
});

afterEach(() => {
	process.chdir(join(TEST_DIR, ".."));
	if (existsSync(TEST_DIR)) {
		rmSync(TEST_DIR, { recursive: true, force: true });
	}
});

describe("loadRalphConfig", () => {
	test("loads valid config", async () => {
		const config = await loadRalphConfig();

		expect(config.default_agent).toBe("test");
		expect(config.default_iterations).toBe(5);
		expect(config.auto_archive).toBe(false);
		expect(config.agents.test).toEqual({
			command: "echo",
			args: ["test output"],
		});
	});

	test("throws if config doesn't exist", async () => {
		rmSync(CONFIG_PATH);

		await expect(loadRalphConfig()).rejects.toThrow("Ralph config not found");
	});

	test("throws if config is invalid", async () => {
		writeFileSync(CONFIG_PATH, "invalid toml");

		await expect(loadRalphConfig()).rejects.toThrow();
	});

	test("parses multiple agents", async () => {
		const config = await loadRalphConfig();

		expect(config.agents.test).toBeDefined();
		expect(config.agents.claude).toBeDefined();
		expect(config.agents.claude?.command).toBe("npx");
	});
});

describe("runAgent", () => {
	test("spawns agent with prompt", async () => {
		const agentConfig = {
			command: "echo",
			args: ["hello"],
		};

		const result = await runAgent("test prompt", agentConfig);

		expect(result.output).toContain("hello");
		expect(result.exitCode).toBe(0);
	});

	test("returns exit code on failure", async () => {
		const agentConfig = {
			command: "false", // Command that always fails
			args: [],
		};

		const result = await runAgent("test", agentConfig);

		expect(result.exitCode).toBe(1);
	});
});

describe("runOrchestration", () => {
	test("throws if PRD doesn't exist", async () => {
		await expect(runOrchestration("nonexistent", "test", 1)).rejects.toThrow(
			"PRD not found: nonexistent",
		);
	});

	test("throws if agent doesn't exist", async () => {
		await createPRD("test-prd", {
			branchName: "main",
			description: "Test PRD",
			userStories: [
				{
					id: "US-001",
					title: "Test story",
					specFile: "test.md",
					scope: "Test scope",
					acceptanceCriteria: ["Done"],
					priority: 1,
					passes: false,
					notes: "",
				},
			],
		});

		await expect(runOrchestration("test-prd", "nonexistent", 1)).rejects.toThrow(
			"Agent 'nonexistent' not found",
		);
	});

	test("completes when no stories remain", async () => {
		await createPRD("completed-prd", {
			branchName: "main",
			description: "Completed PRD",
			userStories: [
				{
					id: "US-001",
					title: "Done story",
					specFile: "test.md",
					scope: "Test",
					acceptanceCriteria: ["Done"],
					priority: 1,
					passes: true,
					notes: "",
				},
			],
		});

		// Should complete immediately without running agent
		await runOrchestration("completed-prd", "test", 1);
	});
});
