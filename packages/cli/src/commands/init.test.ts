import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { existsSync, mkdirSync, rmSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { runInit } from "./init";

describe("init command", () => {
	let testDir: string;
	let originalCwd: string;

	beforeEach(() => {
		originalCwd = process.cwd();
		testDir = join(import.meta.dir, `test-init-${Date.now()}`);
		mkdirSync(testDir, { recursive: true });
		process.chdir(testDir);
	});

	afterEach(() => {
		process.chdir(originalCwd);
		if (existsSync(testDir)) {
			rmSync(testDir, { recursive: true, force: true });
		}
	});

	test("creates omni/ directory", async () => {
		await runInit();

		expect(existsSync("omni")).toBe(true);
		expect(existsSync("omni/capabilities")).toBe(true);
	});

	test("creates omni/config.toml with default config", async () => {
		await runInit();

		expect(existsSync("omni/config.toml")).toBe(true);

		const content = readFileSync("omni/config.toml", "utf-8");
		expect(content).toContain('project = "my-project"');
		expect(content).toContain('default_profile = "default"');
		expect(content).toContain("[capabilities]");
		expect(content).toContain("[profiles.default]");
	});

	test("creates .omni/ directory with subdirectories", async () => {
		await runInit();

		expect(existsSync(".omni")).toBe(true);
		expect(existsSync(".omni/generated")).toBe(true);
		expect(existsSync(".omni/state")).toBe(true);
		expect(existsSync(".omni/sandbox")).toBe(true);
	});

	test("creates agents.md reference file", async () => {
		await runInit();

		expect(existsSync("agents.md")).toBe(true);

		const content = readFileSync("agents.md", "utf-8");
		expect(content).toContain("# Agent Configuration");
		expect(content).toContain("Managed by OmniDev");
		expect(content).toContain("omnidev agents sync");
	});

	test("creates .claude/claude.md reference file", async () => {
		await runInit();

		expect(existsSync(".claude")).toBe(true);
		expect(existsSync(".claude/claude.md")).toBe(true);

		const content = readFileSync(".claude/claude.md", "utf-8");
		expect(content).toContain("# Claude Code Configuration");
		expect(content).toContain("Managed by OmniDev");
		expect(content).toContain(".claude/skills/");
	});

	test("creates .gitignore with OmniDev entries when file does not exist", async () => {
		await runInit();

		expect(existsSync(".gitignore")).toBe(true);

		const content = readFileSync(".gitignore", "utf-8");
		expect(content).toContain(".omni/");
		expect(content).toContain(".claude/skills/");
		expect(content).toContain(".cursor/rules/omnidev-*.mdc");
	});

	test("appends to .gitignore when file exists", async () => {
		await Bun.write(".gitignore", "node_modules/\n");

		await runInit();

		const content = readFileSync(".gitignore", "utf-8");
		expect(content).toContain("node_modules/");
		expect(content).toContain(".omni/");
		expect(content).toContain(".claude/skills/");
	});

	test("does not duplicate .gitignore entries on re-run", async () => {
		await runInit();
		await runInit();

		const content = readFileSync(".gitignore", "utf-8");
		const matches = content.match(/.omni\//g);
		expect(matches?.length).toBe(1);
	});

	test("is idempotent - safe to run multiple times", async () => {
		await runInit();
		await runInit();
		await runInit();

		expect(existsSync("omni/config.toml")).toBe(true);
		expect(existsSync(".omni")).toBe(true);
		expect(existsSync("agents.md")).toBe(true);
		expect(existsSync(".claude/claude.md")).toBe(true);
	});

	test("does not overwrite existing config.toml", async () => {
		const customConfig = 'project = "custom"\n';
		mkdirSync("omni", { recursive: true });
		await Bun.write("omni/config.toml", customConfig);

		await runInit();

		const content = readFileSync("omni/config.toml", "utf-8");
		expect(content).toBe(customConfig);
	});

	test("does not overwrite existing reference files", async () => {
		const customAgents = "# Custom agents\n";
		await Bun.write("agents.md", customAgents);

		await runInit();

		const content = readFileSync("agents.md", "utf-8");
		expect(content).toBe(customAgents);
	});

	test("creates all directories even if some already exist", async () => {
		mkdirSync("omni", { recursive: true });

		await runInit();

		expect(existsSync("omni/capabilities")).toBe(true);
		expect(existsSync(".omni")).toBe(true);
		expect(existsSync(".omni/generated")).toBe(true);
		expect(existsSync(".omni/state")).toBe(true);
		expect(existsSync(".omni/sandbox")).toBe(true);
	});
});
