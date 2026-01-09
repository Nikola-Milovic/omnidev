import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { existsSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import {
	loadCapabilitiesState,
	writeCapabilitiesState,
	enableCapability,
	disableCapability,
	type CapabilitiesState,
} from "./capabilities";

describe("capabilities state management", () => {
	let testDir: string;
	let originalCwd: string;

	beforeEach(() => {
		originalCwd = process.cwd();
		testDir = join(import.meta.dir, `test-capabilities-${Date.now()}`);
		mkdirSync(testDir, { recursive: true });
		process.chdir(testDir);
		mkdirSync(".omni", { recursive: true });
	});

	afterEach(() => {
		process.chdir(originalCwd);
		if (existsSync(testDir)) {
			rmSync(testDir, { recursive: true, force: true });
		}
	});

	describe("loadCapabilitiesState", () => {
		test("returns empty arrays when file doesn't exist", async () => {
			const state = await loadCapabilitiesState();
			expect(state).toEqual({ enabled: [], disabled: [] });
		});

		test("loads existing capabilities state", async () => {
			await Bun.write(
				".omni/capabilities.toml",
				`enabled = ["tasks", "notes"]
disabled = ["debug"]
`,
			);

			const state = await loadCapabilitiesState();
			expect(state.enabled).toEqual(["tasks", "notes"]);
			expect(state.disabled).toEqual(["debug"]);
		});

		test("handles empty arrays in TOML", async () => {
			await Bun.write(
				".omni/capabilities.toml",
				`enabled = []
disabled = []
`,
			);

			const state = await loadCapabilitiesState();
			expect(state.enabled).toEqual([]);
			expect(state.disabled).toEqual([]);
		});

		test("throws on invalid TOML", async () => {
			await Bun.write(".omni/capabilities.toml", "invalid toml [[[");

			await expect(loadCapabilitiesState()).rejects.toThrow("Invalid TOML");
		});
	});

	describe("writeCapabilitiesState", () => {
		test("writes capabilities state to file", async () => {
			const state: CapabilitiesState = {
				enabled: ["tasks"],
				disabled: ["debug"],
			};

			await writeCapabilitiesState(state);

			expect(existsSync(".omni/capabilities.toml")).toBe(true);
			const content = await Bun.file(".omni/capabilities.toml").text();
			expect(content).toContain('enabled = ["tasks"]');
			expect(content).toContain('disabled = ["debug"]');
		});

		test("handles empty arrays", async () => {
			const state: CapabilitiesState = {
				enabled: [],
				disabled: [],
			};

			await writeCapabilitiesState(state);

			const content = await Bun.file(".omni/capabilities.toml").text();
			expect(content).toContain("enabled = []");
			expect(content).toContain("disabled = []");
		});

		test("includes comments in output", async () => {
			const state: CapabilitiesState = {
				enabled: ["tasks"],
				disabled: [],
			};

			await writeCapabilitiesState(state);

			const content = await Bun.file(".omni/capabilities.toml").text();
			expect(content).toContain("# OmniDev Capabilities State");
			expect(content).toContain("# Enabled capabilities");
		});
	});

	describe("enableCapability", () => {
		test("adds capability to enabled list", async () => {
			await writeCapabilitiesState({ enabled: [], disabled: [] });

			await enableCapability("tasks");

			const state = await loadCapabilitiesState();
			expect(state.enabled).toContain("tasks");
			expect(state.disabled).not.toContain("tasks");
		});

		test("removes capability from disabled list when enabling", async () => {
			await writeCapabilitiesState({
				enabled: [],
				disabled: ["tasks"],
			});

			await enableCapability("tasks");

			const state = await loadCapabilitiesState();
			expect(state.enabled).toContain("tasks");
			expect(state.disabled).not.toContain("tasks");
		});

		test("does not duplicate if already enabled", async () => {
			await writeCapabilitiesState({
				enabled: ["tasks"],
				disabled: [],
			});

			await enableCapability("tasks");

			const state = await loadCapabilitiesState();
			expect(state.enabled?.filter((id) => id === "tasks")).toHaveLength(1);
		});

		test("creates file if it doesn't exist", async () => {
			expect(existsSync(".omni/capabilities.toml")).toBe(false);

			await enableCapability("tasks");

			expect(existsSync(".omni/capabilities.toml")).toBe(true);
			const state = await loadCapabilitiesState();
			expect(state.enabled).toContain("tasks");
		});
	});

	describe("disableCapability", () => {
		test("adds capability to disabled list", async () => {
			await writeCapabilitiesState({ enabled: [], disabled: [] });

			await disableCapability("tasks");

			const state = await loadCapabilitiesState();
			expect(state.disabled).toContain("tasks");
			expect(state.enabled).not.toContain("tasks");
		});

		test("removes capability from enabled list when disabling", async () => {
			await writeCapabilitiesState({
				enabled: ["tasks"],
				disabled: [],
			});

			await disableCapability("tasks");

			const state = await loadCapabilitiesState();
			expect(state.disabled).toContain("tasks");
			expect(state.enabled).not.toContain("tasks");
		});

		test("does not duplicate if already disabled", async () => {
			await writeCapabilitiesState({
				enabled: [],
				disabled: ["tasks"],
			});

			await disableCapability("tasks");

			const state = await loadCapabilitiesState();
			expect(state.disabled?.filter((id) => id === "tasks")).toHaveLength(1);
		});

		test("creates file if it doesn't exist", async () => {
			expect(existsSync(".omni/capabilities.toml")).toBe(false);

			await disableCapability("tasks");

			expect(existsSync(".omni/capabilities.toml")).toBe(true);
			const state = await loadCapabilitiesState();
			expect(state.disabled).toContain("tasks");
		});
	});
});
