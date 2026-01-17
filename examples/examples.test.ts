import { describe, expect, test } from "bun:test";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { captureConsole, setupTestDir } from "../packages/core/src/test-utils/index.js";
import { runInit } from "../packages/cli/src/commands/init.js";
import { runSync } from "../packages/cli/src/commands/sync.js";

/**
 * Integration tests that validate the full OmniDev workflow:
 * init → sync → verify outputs
 *
 * These tests use fixture capabilities from ./fixtures/ to ensure
 * the CLI produces expected outputs when given real configurations.
 *
 * NOTE: These tests are co-located with the fixtures they test.
 * If you modify fixtures, update these tests accordingly.
 */
describe("examples integration", () => {
	setupTestDir("examples-integration-", { chdir: true });

	// Get absolute path to fixtures directory (co-located in same directory)
	const fixturesDir = resolve(__dirname, "fixtures");

	describe("basic workflow with tasks capability", () => {
		test("syncs a single capability and produces expected outputs", async () => {
			// Create omni.toml with tasks capability using file:// source
			const config = `
[capabilities.sources]
tasks = "file://${fixturesDir}/tasks"

[profiles.default]
capabilities = ["tasks"]
`;
			await Bun.write("omni.toml", config);

			// Run init to create directories
			await captureConsole(async () => {
				await runInit({}, "claude");
			});

			// Run sync to fetch capabilities and write outputs
			await captureConsole(async () => {
				await runSync();
			});

			// Verify directory structure
			expect(existsSync(".omni")).toBe(true);
			expect(existsSync(".omni/capabilities")).toBe(true);
			expect(existsSync(".omni/capabilities/tasks")).toBe(true);

			// Verify capability was loaded correctly
			expect(existsSync(".omni/capabilities/tasks/capability.toml")).toBe(true);
			expect(existsSync(".omni/capabilities/tasks/skills/task-planning/SKILL.md")).toBe(true);

			// Verify skill output was generated
			expect(existsSync(".claude/skills")).toBe(true);
			const skillDirs = readdirSync(".claude/skills", { withFileTypes: true })
				.filter((d) => d.isDirectory())
				.map((d) => d.name)
				.sort();
			expect(skillDirs).toContain("task-planning");

			// Verify skill content
			const skillPath = ".claude/skills/task-planning/SKILL.md";
			expect(existsSync(skillPath)).toBe(true);
			const skillContent = readFileSync(skillPath, "utf-8");
			expect(skillContent).toContain("Task Planning Skill");
			expect(skillContent).toContain("Break down complex tasks");

			// Verify instructions.md was updated
			const instructionsContent = readFileSync(".omni/instructions.md", "utf-8");
			expect(instructionsContent).toContain("## Capabilities");
		});
	});

	describe("workflow with multiple capabilities", () => {
		test("syncs multiple capabilities and merges outputs", async () => {
			// Create omni.toml with multiple capabilities
			const config = `
[capabilities.sources]
tasks = "file://${fixturesDir}/tasks"
coding-rules = "file://${fixturesDir}/coding-rules"

[profiles.default]
capabilities = ["tasks", "coding-rules"]
`;
			await Bun.write("omni.toml", config);

			await captureConsole(async () => {
				await runInit({}, "claude");
			});

			await captureConsole(async () => {
				await runSync();
			});

			// Verify all capabilities were fetched
			expect(existsSync(".omni/capabilities/tasks")).toBe(true);
			expect(existsSync(".omni/capabilities/coding-rules")).toBe(true);

			// Verify skill from tasks capability
			expect(existsSync(".claude/skills/task-planning/SKILL.md")).toBe(true);

			// Verify rules from coding-rules capability
			expect(existsSync(".cursor/rules")).toBe(true);
			const ruleFiles = readdirSync(".cursor/rules")
				.filter((f) => f.endsWith(".mdc"))
				.sort();
			expect(ruleFiles.length).toBeGreaterThan(0);
			expect(ruleFiles.some((f) => f.includes("typescript"))).toBe(true);

			// Verify instructions.md contains content from all capabilities
			const instructionsContent = readFileSync(".omni/instructions.md", "utf-8");
			expect(instructionsContent).toContain("## Capabilities");
			// Rules should be included
			expect(instructionsContent).toContain("TypeScript");
		});
	});

	describe("profile switching", () => {
		test("different profiles load different capabilities", async () => {
			// Create omni.toml with multiple profiles
			const config = `
[capabilities.sources]
tasks = "file://${fixturesDir}/tasks"
coding-rules = "file://${fixturesDir}/coding-rules"

[profiles.default]
capabilities = ["tasks"]

[profiles.full]
capabilities = ["tasks", "coding-rules"]

[profiles.rules-only]
capabilities = ["coding-rules"]
`;
			await Bun.write("omni.toml", config);

			// Init with default profile
			await captureConsole(async () => {
				await runInit({}, "claude");
			});

			// Sync - should only have tasks capability
			await captureConsole(async () => {
				await runSync();
			});

			// Default profile should have task-planning skill
			expect(existsSync(".claude/skills/task-planning/SKILL.md")).toBe(true);

			// Default profile should NOT have rules (since coding-rules not in default profile)
			const ruleFiles = existsSync(".cursor/rules")
				? readdirSync(".cursor/rules").filter((f) => f.endsWith(".mdc"))
				: [];
			expect(ruleFiles.length).toBe(0);
		});
	});

	describe("sync idempotency", () => {
		test("multiple syncs produce consistent results", async () => {
			const config = `
[capabilities.sources]
tasks = "file://${fixturesDir}/tasks"

[profiles.default]
capabilities = ["tasks"]
`;
			await Bun.write("omni.toml", config);

			await captureConsole(async () => {
				await runInit({}, "claude");
			});

			// Run sync multiple times
			for (let i = 0; i < 3; i++) {
				await captureConsole(async () => {
					await runSync();
				});
			}

			// Verify outputs still exist and are correct
			expect(existsSync(".claude/skills/task-planning/SKILL.md")).toBe(true);

			const skillContent = readFileSync(".claude/skills/task-planning/SKILL.md", "utf-8");
			expect(skillContent).toContain("Task Planning Skill");

			// Verify no duplicate directories
			const skillDirs = readdirSync(".claude/skills", { withFileTypes: true })
				.filter((d) => d.isDirectory())
				.map((d) => d.name);
			const uniqueDirs = [...new Set(skillDirs)];
			expect(skillDirs.length).toBe(uniqueDirs.length);
		});
	});

	describe("error handling", () => {
		test("sync fails gracefully with missing capability source", async () => {
			const config = `
[capabilities.sources]
nonexistent = "file:///nonexistent/path/to/capability"

[profiles.default]
capabilities = ["nonexistent"]
`;
			await Bun.write("omni.toml", config);

			await captureConsole(async () => {
				await runInit({}, "claude");
			});

			// Sync should handle the error
			const { stderr } = await captureConsole(async () => {
				try {
					await runSync();
				} catch {
					// Expected to throw
				}
			});

			// Should have some error output
			expect(stderr.length).toBeGreaterThan(0);
		});

		test("sync continues with valid capabilities when one is missing", async () => {
			const config = `
[capabilities.sources]
tasks = "file://${fixturesDir}/tasks"

[profiles.default]
# Reference a capability that has no source defined
capabilities = ["tasks", "undefined-capability"]
`;
			await Bun.write("omni.toml", config);

			await captureConsole(async () => {
				await runInit({}, "claude");
			});

			// Sync should still work for the valid capability
			await captureConsole(async () => {
				try {
					await runSync();
				} catch {
					// May throw for missing capability
				}
			});

			// Tasks capability should still be synced
			expect(existsSync(".omni/capabilities/tasks")).toBe(true);
		});
	});

	describe("CLAUDE.md generation", () => {
		test("CLAUDE.md is created for claude provider", async () => {
			const config = `
[capabilities.sources]
tasks = "file://${fixturesDir}/tasks"

[profiles.default]
capabilities = ["tasks"]
`;
			await Bun.write("omni.toml", config);

			await captureConsole(async () => {
				await runInit({}, "claude");
			});

			await captureConsole(async () => {
				await runSync();
			});

			expect(existsSync("CLAUDE.md")).toBe(true);
			const claudeContent = readFileSync("CLAUDE.md", "utf-8");
			expect(claudeContent).toContain("@import .omni/instructions.md");
		});
	});

	describe("lockfile generation", () => {
		test("omni.lock.toml is created after sync", async () => {
			const config = `
[capabilities.sources]
tasks = "file://${fixturesDir}/tasks"

[profiles.default]
capabilities = ["tasks"]
`;
			await Bun.write("omni.toml", config);

			await captureConsole(async () => {
				await runInit({}, "claude");
			});

			await captureConsole(async () => {
				await runSync();
			});

			expect(existsSync("omni.lock.toml")).toBe(true);
			const lockContent = readFileSync("omni.lock.toml", "utf-8");
			expect(lockContent).toContain("tasks");
		});
	});
});
