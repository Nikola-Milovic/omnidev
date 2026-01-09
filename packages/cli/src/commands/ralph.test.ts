/**
 * Tests for Ralph CLI commands
 */

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { runRalphInit } from "./ralph";

const TEST_DIR = join(process.cwd(), ".test-ralph-cli");
const RALPH_DIR = join(TEST_DIR, ".omni/ralph");
const CONFIG_PATH = join(RALPH_DIR, "config.toml");
const PRDS_DIR = join(RALPH_DIR, "prds");
const COMPLETED_PRDS_DIR = join(RALPH_DIR, "completed-prds");

beforeEach(() => {
	// Create test directory
	mkdirSync(TEST_DIR, { recursive: true });
	process.chdir(TEST_DIR);
});

afterEach(() => {
	process.chdir(join(TEST_DIR, ".."));
	if (existsSync(TEST_DIR)) {
		rmSync(TEST_DIR, { recursive: true, force: true });
	}
});

describe("runRalphInit", () => {
	test("creates directory structure", async () => {
		await runRalphInit();

		expect(existsSync(RALPH_DIR)).toBe(true);
		expect(existsSync(PRDS_DIR)).toBe(true);
		expect(existsSync(COMPLETED_PRDS_DIR)).toBe(true);
	});

	test("creates default config", async () => {
		await runRalphInit();

		expect(existsSync(CONFIG_PATH)).toBe(true);

		const content = await Bun.file(CONFIG_PATH).text();
		expect(content).toContain("[ralph]");
		expect(content).toContain("default_agent");
		expect(content).toContain("[agents.claude]");
	});

	test("doesn't overwrite existing config", async () => {
		// First init
		await runRalphInit();

		// Modify config
		const customConfig = "[ralph]\ncustom = true\n";
		await Bun.write(CONFIG_PATH, customConfig);

		// Second init
		await runRalphInit();

		// Config should be unchanged
		const content = await Bun.file(CONFIG_PATH).text();
		expect(content).toBe(customConfig);
	});

	test("is idempotent", async () => {
		await runRalphInit();
		await runRalphInit();

		expect(existsSync(RALPH_DIR)).toBe(true);
		expect(existsSync(CONFIG_PATH)).toBe(true);
	});
});

// Note: runRalphStatus and runRalphStart tests are skipped because they require
// the ralph capability to be available, which isn't set up in the test environment.
// These commands are tested through integration tests instead.
