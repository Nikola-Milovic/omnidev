import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "../test-utils/index.js";
import {
	clearActiveProfileState,
	readActiveProfileState,
	writeActiveProfileState,
} from "./active-profile";

describe("active-profile state", () => {
	let originalCwd: string;
	let tempDir: string;

	beforeEach(() => {
		originalCwd = process.cwd();
		tempDir = tmpdir("active-profile-test-");
		mkdirSync(join(tempDir, ".omni"), { recursive: true });
		process.chdir(tempDir);
	});

	afterEach(() => {
		process.chdir(originalCwd);
		rmSync(tempDir, { recursive: true, force: true });
	});

	describe("readActiveProfileState", () => {
		test("returns null when state file does not exist", async () => {
			const profile = await readActiveProfileState();
			expect(profile).toBe(null);
		});

		test("reads profile from state file", async () => {
			mkdirSync(".omni/state", { recursive: true });
			await Bun.write(".omni/state/active-profile", "my-profile");

			const profile = await readActiveProfileState();
			expect(profile).toBe("my-profile");
		});

		test("trims whitespace from profile name", async () => {
			mkdirSync(".omni/state", { recursive: true });
			await Bun.write(".omni/state/active-profile", "  my-profile  \n");

			const profile = await readActiveProfileState();
			expect(profile).toBe("my-profile");
		});

		test("returns null for empty file", async () => {
			mkdirSync(".omni/state", { recursive: true });
			await Bun.write(".omni/state/active-profile", "");

			const profile = await readActiveProfileState();
			expect(profile).toBe(null);
		});

		test("returns null for whitespace-only file", async () => {
			mkdirSync(".omni/state", { recursive: true });
			await Bun.write(".omni/state/active-profile", "   \n  ");

			const profile = await readActiveProfileState();
			expect(profile).toBe(null);
		});
	});

	describe("writeActiveProfileState", () => {
		test("writes profile to state file", async () => {
			await writeActiveProfileState("production");

			const content = await Bun.file(".omni/state/active-profile").text();
			expect(content).toBe("production");
		});

		test("creates state directory if it does not exist", async () => {
			expect(existsSync(".omni/state")).toBe(false);

			await writeActiveProfileState("dev");

			expect(existsSync(".omni/state")).toBe(true);
			const content = await Bun.file(".omni/state/active-profile").text();
			expect(content).toBe("dev");
		});

		test("overwrites existing state file", async () => {
			mkdirSync(".omni/state", { recursive: true });
			await Bun.write(".omni/state/active-profile", "old-profile");

			await writeActiveProfileState("new-profile");

			const content = await Bun.file(".omni/state/active-profile").text();
			expect(content).toBe("new-profile");
		});
	});

	describe("clearActiveProfileState", () => {
		test("deletes state file when it exists", async () => {
			mkdirSync(".omni/state", { recursive: true });
			await Bun.write(".omni/state/active-profile", "some-profile");

			expect(existsSync(".omni/state/active-profile")).toBe(true);

			await clearActiveProfileState();

			expect(existsSync(".omni/state/active-profile")).toBe(false);
		});

		test("does nothing when state file does not exist", async () => {
			expect(existsSync(".omni/state/active-profile")).toBe(false);

			// Should not throw
			await clearActiveProfileState();

			expect(existsSync(".omni/state/active-profile")).toBe(false);
		});
	});

	describe("round-trip", () => {
		test("write then read returns same profile", async () => {
			await writeActiveProfileState("test-profile");
			const profile = await readActiveProfileState();
			expect(profile).toBe("test-profile");
		});

		test("clear then read returns null", async () => {
			await writeActiveProfileState("test-profile");
			await clearActiveProfileState();
			const profile = await readActiveProfileState();
			expect(profile).toBe(null);
		});
	});
});
