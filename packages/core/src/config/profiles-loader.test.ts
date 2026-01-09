import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { existsSync, mkdirSync, rmSync } from "node:fs";
import {
	loadProfiles,
	parseProfiles,
	writeProfiles,
	getProfile,
	setProfile,
	deleteProfile,
	listProfiles,
	type ProfilesConfig,
} from "./profiles-loader";

const TEST_DIR = ".test-profiles";
const PROFILES_PATH = ".omni/profiles.toml";

describe("profiles-loader", () => {
	beforeEach(() => {
		if (existsSync(TEST_DIR)) {
			rmSync(TEST_DIR, { recursive: true });
		}
		mkdirSync(`${TEST_DIR}/.omni`, { recursive: true });
		process.chdir(TEST_DIR);
	});

	afterEach(() => {
		process.chdir("..");
		if (existsSync(TEST_DIR)) {
			rmSync(TEST_DIR, { recursive: true });
		}
	});

	describe("parseProfiles", () => {
		test("parses empty profiles config", () => {
			const content = `[profiles.default]`;
			const result = parseProfiles(content);
			expect(result.profiles?.default).toBeDefined();
		});

		test("parses profile with enable list", () => {
			const content = `[profiles.planning]
enable = ["ralph", "tasks"]`;
			const result = parseProfiles(content);
			expect(result.profiles?.planning?.enable).toEqual(["ralph", "tasks"]);
		});

		test("parses profile with disable list", () => {
			const content = `[profiles.minimal]
disable = ["ralph"]`;
			const result = parseProfiles(content);
			expect(result.profiles?.minimal?.disable).toEqual(["ralph"]);
		});

		test("parses multiple profiles", () => {
			const content = `[profiles.default]

[profiles.planning]
enable = ["ralph"]

[profiles.coding]
enable = ["tasks"]
disable = ["ralph"]`;
			const result = parseProfiles(content);
			expect(Object.keys(result.profiles ?? {})).toEqual(["default", "planning", "coding"]);
			expect(result.profiles?.planning?.enable).toEqual(["ralph"]);
			expect(result.profiles?.coding?.enable).toEqual(["tasks"]);
			expect(result.profiles?.coding?.disable).toEqual(["ralph"]);
		});
	});

	describe("loadProfiles", () => {
		test("returns empty profiles when file doesn't exist", async () => {
			const result = await loadProfiles();
			expect(result.profiles).toEqual({});
		});

		test("loads existing profiles file", async () => {
			const config: ProfilesConfig = {
				profiles: {
					default: {},
					planning: { enable: ["ralph"] },
				},
			};
			await writeProfiles(config);

			const result = await loadProfiles();
			expect(result.profiles?.default).toBeDefined();
			expect(result.profiles?.planning?.enable).toEqual(["ralph"]);
		});
	});

	describe("writeProfiles", () => {
		test("writes profiles with comments", async () => {
			const config: ProfilesConfig = {
				profiles: {
					default: {},
					planning: { enable: ["ralph"] },
				},
			};
			await writeProfiles(config);

			expect(existsSync(PROFILES_PATH)).toBe(true);
			const content = await Bun.file(PROFILES_PATH).text();
			expect(content).toContain("# OmniDev Profiles");
			expect(content).toContain("[profiles.default]");
			expect(content).toContain("[profiles.planning]");
		});

		test("writes empty enable/disable arrays", async () => {
			const config: ProfilesConfig = {
				profiles: {
					minimal: { enable: [], disable: [] },
				},
			};
			await writeProfiles(config);

			const content = await Bun.file(PROFILES_PATH).text();
			expect(content).toContain("enable = []");
			expect(content).toContain("disable = []");
		});

		test("writes non-empty enable/disable arrays", async () => {
			const config: ProfilesConfig = {
				profiles: {
					planning: { enable: ["ralph", "tasks"], disable: ["other"] },
				},
			};
			await writeProfiles(config);

			const content = await Bun.file(PROFILES_PATH).text();
			expect(content).toContain('enable = ["ralph","tasks"]');
			expect(content).toContain('disable = ["other"]');
		});
	});

	describe("getProfile", () => {
		test("returns undefined when profile doesn't exist", async () => {
			const result = await getProfile("nonexistent");
			expect(result).toBeUndefined();
		});

		test("returns profile when it exists", async () => {
			const config: ProfilesConfig = {
				profiles: {
					planning: { enable: ["ralph"] },
				},
			};
			await writeProfiles(config);

			const result = await getProfile("planning");
			expect(result?.enable).toEqual(["ralph"]);
		});
	});

	describe("setProfile", () => {
		test("creates new profile", async () => {
			await setProfile("custom", { enable: ["tasks"] });

			const profiles = await loadProfiles();
			expect(profiles.profiles?.custom?.enable).toEqual(["tasks"]);
		});

		test("updates existing profile", async () => {
			await setProfile("planning", { enable: ["ralph"] });
			await setProfile("planning", { enable: ["ralph", "tasks"] });

			const profiles = await loadProfiles();
			expect(profiles.profiles?.planning?.enable).toEqual(["ralph", "tasks"]);
		});

		test("creates profiles object if it doesn't exist", async () => {
			await setProfile("first", { enable: [] });

			const profiles = await loadProfiles();
			expect(profiles.profiles).toBeDefined();
			expect(profiles.profiles?.first).toBeDefined();
		});
	});

	describe("deleteProfile", () => {
		test("returns false when profile doesn't exist", async () => {
			const result = await deleteProfile("nonexistent");
			expect(result).toBe(false);
		});

		test("deletes existing profile", async () => {
			await setProfile("temp", { enable: ["tasks"] });
			const result = await deleteProfile("temp");

			expect(result).toBe(true);
			const profiles = await loadProfiles();
			expect(profiles.profiles?.temp).toBeUndefined();
		});
	});

	describe("listProfiles", () => {
		test("returns empty array when no profiles", async () => {
			const result = await listProfiles();
			expect(result).toEqual([]);
		});

		test("returns all profile names", async () => {
			const config: ProfilesConfig = {
				profiles: {
					default: {},
					planning: { enable: ["ralph"] },
					coding: { enable: ["tasks"] },
				},
			};
			await writeProfiles(config);

			const result = await listProfiles();
			expect(result.sort()).toEqual(["coding", "default", "planning"]);
		});
	});
});
