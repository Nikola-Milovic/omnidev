import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import type { OmniConfig } from "../types/index.js";
import { getActiveProfile, resolveEnabledCapabilities, setActiveProfile } from "./profiles.js";

describe("getActiveProfile", () => {
	const TEST_DIR = ".omni-test-profiles";
	let originalCwd: string;

	beforeEach(() => {
		// Create test directory with .omni subdirectory
		if (!existsSync(TEST_DIR)) {
			mkdirSync(TEST_DIR, { recursive: true });
		}
		// Change to test directory
		originalCwd = process.cwd();
		process.chdir(TEST_DIR);
		// Create .omni directory for active-profile file
		if (!existsSync(".omni")) {
			mkdirSync(".omni", { recursive: true });
		}
	});

	afterEach(() => {
		// Return to original directory
		process.chdir(originalCwd);
		// Clean up test directory
		if (existsSync(TEST_DIR)) {
			rmSync(TEST_DIR, { recursive: true, force: true });
		}
	});

	test("returns null when active-profile file does not exist", async () => {
		const profile = await getActiveProfile();
		expect(profile).toBe(null);
	});

	test("returns profile name when file exists", async () => {
		writeFileSync(".omni/active-profile", "dev", "utf-8");
		const profile = await getActiveProfile();
		expect(profile).toBe("dev");
	});

	test("trims whitespace from profile name", async () => {
		writeFileSync(".omni/active-profile", "  production  \n", "utf-8");
		const profile = await getActiveProfile();
		expect(profile).toBe("production");
	});
});

describe("setActiveProfile", () => {
	const TEST_DIR = ".omni-test-profiles-set";
	let originalCwd: string;

	beforeEach(() => {
		// Create test directory with .omni subdirectory
		if (!existsSync(TEST_DIR)) {
			mkdirSync(TEST_DIR, { recursive: true });
		}
		// Change to test directory
		originalCwd = process.cwd();
		process.chdir(TEST_DIR);
		// Create .omni directory for active-profile file
		if (!existsSync(".omni")) {
			mkdirSync(".omni", { recursive: true });
		}
	});

	afterEach(() => {
		// Return to original directory
		process.chdir(originalCwd);
		// Clean up test directory
		if (existsSync(TEST_DIR)) {
			rmSync(TEST_DIR, { recursive: true, force: true });
		}
	});

	test("creates active-profile file with profile name", async () => {
		await setActiveProfile("staging");
		expect(existsSync(".omni/active-profile")).toBe(true);
		const content = await Bun.file(".omni/active-profile").text();
		expect(content).toBe("staging");
	});

	test("overwrites existing active-profile file", async () => {
		await setActiveProfile("dev");
		await setActiveProfile("prod");
		const content = await Bun.file(".omni/active-profile").text();
		expect(content).toBe("prod");
	});
});

describe("resolveEnabledCapabilities", () => {
	test("returns empty array when no capabilities configured", () => {
		const config: OmniConfig = {};
		const result = resolveEnabledCapabilities(config, null);
		expect(result).toEqual([]);
	});

	test("returns base enabled capabilities when no profile specified", () => {
		const config: OmniConfig = {
			capabilities: {
				enable: ["tasks", "filesystem"],
			},
		};
		const result = resolveEnabledCapabilities(config, null);
		expect(result).toEqual(["tasks", "filesystem"]);
	});

	test("excludes disabled capabilities from base", () => {
		const config: OmniConfig = {
			capabilities: {
				enable: ["tasks", "filesystem", "network"],
				disable: ["network"],
			},
		};
		const result = resolveEnabledCapabilities(config, null);
		expect(result).toEqual(["tasks", "filesystem"]);
	});

	test("applies profile enable to add capabilities", () => {
		const config: OmniConfig = {
			capabilities: {
				enable: ["tasks"],
			},
			profiles: {
				dev: {
					enable: ["filesystem", "debug"],
				},
			},
		};
		const result = resolveEnabledCapabilities(config, "dev");
		expect(result).toEqual(["tasks", "filesystem", "debug"]);
	});

	test("applies profile disable to remove capabilities", () => {
		const config: OmniConfig = {
			capabilities: {
				enable: ["tasks", "filesystem", "network"],
			},
			profiles: {
				prod: {
					disable: ["debug", "filesystem"],
				},
			},
		};
		const result = resolveEnabledCapabilities(config, "prod");
		expect(result).toEqual(["tasks", "network"]);
	});

	test("applies both profile enable and disable", () => {
		const config: OmniConfig = {
			capabilities: {
				enable: ["tasks", "filesystem"],
			},
			profiles: {
				staging: {
					enable: ["network"],
					disable: ["filesystem"],
				},
			},
		};
		const result = resolveEnabledCapabilities(config, "staging");
		expect(result).toEqual(["tasks", "network"]);
	});

	test("uses default_profile when profileName is null", () => {
		const config: OmniConfig = {
			default_profile: "dev",
			capabilities: {
				enable: ["tasks"],
			},
			profiles: {
				dev: {
					enable: ["debug"],
				},
			},
		};
		const result = resolveEnabledCapabilities(config, null);
		expect(result).toEqual(["tasks", "debug"]);
	});

	test('falls back to "default" profile when default_profile not set', () => {
		const config: OmniConfig = {
			capabilities: {
				enable: ["tasks"],
			},
			profiles: {
				default: {
					enable: ["filesystem"],
				},
			},
		};
		const result = resolveEnabledCapabilities(config, null);
		expect(result).toEqual(["tasks", "filesystem"]);
	});

	test("handles non-existent profile gracefully", () => {
		const config: OmniConfig = {
			capabilities: {
				enable: ["tasks", "filesystem"],
			},
			profiles: {
				dev: {
					enable: ["debug"],
				},
			},
		};
		const result = resolveEnabledCapabilities(config, "nonexistent");
		expect(result).toEqual(["tasks", "filesystem"]);
	});

	test("handles config with no profiles defined", () => {
		const config: OmniConfig = {
			capabilities: {
				enable: ["tasks", "filesystem"],
			},
		};
		const result = resolveEnabledCapabilities(config, "dev");
		expect(result).toEqual(["tasks", "filesystem"]);
	});

	test("does not duplicate capabilities when profile re-enables base capability", () => {
		const config: OmniConfig = {
			capabilities: {
				enable: ["tasks", "filesystem"],
			},
			profiles: {
				dev: {
					enable: ["tasks", "debug"],
				},
			},
		};
		const result = resolveEnabledCapabilities(config, "dev");
		expect(result).toEqual(["tasks", "filesystem", "debug"]);
	});

	test("respects profile disable even if capability is in profile enable", () => {
		const config: OmniConfig = {
			capabilities: {
				enable: ["tasks", "filesystem"],
			},
			profiles: {
				conflicted: {
					enable: ["tasks", "debug"],
					disable: ["tasks"],
				},
			},
		};
		const result = resolveEnabledCapabilities(config, "conflicted");
		expect(result).toEqual(["filesystem", "debug"]);
	});
});
