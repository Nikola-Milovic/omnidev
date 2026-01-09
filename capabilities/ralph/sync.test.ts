import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, rmSync } from "node:fs";
import { sync } from "./sync";

describe("Ralph sync hook", () => {
	const testDir = "test-ralph-sync";

	beforeEach(() => {
		// Create test directory
		mkdirSync(testDir, { recursive: true });
		// Change to test directory
		process.chdir(testDir);
	});

	afterEach(() => {
		// Change back to original directory
		process.chdir("..");
		// Clean up test directory
		if (existsSync(testDir)) {
			rmSync(testDir, { recursive: true, force: true });
		}
	});

	test("creates .omni/ralph directory structure", async () => {
		await sync();

		expect(existsSync(".omni/ralph")).toBe(true);
		expect(existsSync(".omni/ralph/prds")).toBe(true);
		expect(existsSync(".omni/ralph/completed-prds")).toBe(true);
	});

	test("creates default config.toml if not exists", async () => {
		await sync();

		expect(existsSync(".omni/ralph/config.toml")).toBe(true);

		const content = await Bun.file(".omni/ralph/config.toml").text();
		expect(content).toContain("[ralph]");
		expect(content).toContain('default_agent = "claude"');
		expect(content).toContain("default_iterations = 10");
		expect(content).toContain("auto_archive = true");
		expect(content).toContain("[agents.claude]");
		expect(content).toContain("[agents.codex]");
		expect(content).toContain("[agents.amp]");
	});

	test("does not overwrite existing config.toml", async () => {
		mkdirSync(".omni/ralph", { recursive: true });
		await Bun.write(".omni/ralph/config.toml", "[ralph]\ncustom = true");

		await sync();

		const content = await Bun.file(".omni/ralph/config.toml").text();
		expect(content).toBe("[ralph]\ncustom = true");
		expect(content).not.toContain("default_agent");
	});

	test("creates .gitignore with Ralph entry if not exists", async () => {
		await sync();

		expect(existsSync(".gitignore")).toBe(true);

		const content = await Bun.file(".gitignore").text();
		expect(content).toContain(".omni/ralph/");
		expect(content).toContain("# Ralph AI Orchestrator");
	});

	test("updates existing .gitignore without duplicate entries", async () => {
		await Bun.write(".gitignore", "node_modules/\n.env\n");

		await sync();

		const content = await Bun.file(".gitignore").text();
		expect(content).toContain("node_modules/");
		expect(content).toContain(".env");
		expect(content).toContain(".omni/ralph/");
		expect(content).toContain("# Ralph AI Orchestrator");

		// Run sync again - should not duplicate entry
		await sync();

		const content2 = await Bun.file(".gitignore").text();
		const matches = content2.split(".omni/ralph/").length - 1;
		expect(matches).toBe(1);
	});

	test("handles .gitignore without trailing newline", async () => {
		await Bun.write(".gitignore", "node_modules/");

		await sync();

		const content = await Bun.file(".gitignore").text();
		expect(content).toContain("node_modules/");
		expect(content).toContain(".omni/ralph/");
	});

	test("is idempotent - safe to run multiple times", async () => {
		await sync();
		await sync();
		await sync();

		expect(existsSync(".omni/ralph")).toBe(true);
		expect(existsSync(".omni/ralph/prds")).toBe(true);
		expect(existsSync(".omni/ralph/completed-prds")).toBe(true);
		expect(existsSync(".omni/ralph/config.toml")).toBe(true);

		const gitignore = await Bun.file(".gitignore").text();
		const matches = gitignore.split(".omni/ralph/").length - 1;
		expect(matches).toBe(1);
	});

	test("handles existing directory structure gracefully", async () => {
		mkdirSync(".omni/ralph/prds", { recursive: true });
		mkdirSync(".omni/ralph/completed-prds", { recursive: true });

		await sync();

		expect(existsSync(".omni/ralph")).toBe(true);
		expect(existsSync(".omni/ralph/prds")).toBe(true);
		expect(existsSync(".omni/ralph/completed-prds")).toBe(true);
	});

	test("preserves existing PRDs and files", async () => {
		mkdirSync(".omni/ralph/prds/my-prd", { recursive: true });
		await Bun.write(".omni/ralph/prds/my-prd/prd.json", '{"name":"my-prd"}');

		await sync();

		expect(existsSync(".omni/ralph/prds/my-prd/prd.json")).toBe(true);
		const content = await Bun.file(".omni/ralph/prds/my-prd/prd.json").text();
		expect(content).toBe('{"name":"my-prd"}');
	});
});
