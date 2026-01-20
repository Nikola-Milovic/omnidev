import { describe, expect, test } from "bun:test";
import { mkdirSync, writeFileSync } from "node:fs";
import { setupTestDir } from "@omnidev-ai/core/test-utils";
import { loadConfig } from "./config";

const CONFIG_PATH = "omni.toml";
const LOCAL_CONFIG = "omni.local.toml";

describe("loadConfig", () => {
	setupTestDir("loader-test-", { chdir: true });
	test("returns empty config when no files exist", async () => {
		const config = await loadConfig();
		expect(config).toEqual({ profiles: {} });
	});

	test("loads config when only main config exists", async () => {
		mkdirSync(".omni", { recursive: true });
		writeFileSync(
			CONFIG_PATH,
			`
[profiles.dev]
capabilities = ["tasks", "git"]
`,
		);

		const config = await loadConfig();
		expect(config.profiles?.dev?.capabilities).toEqual(["tasks", "git"]);
	});

	test("loads local config when only local config exists", async () => {
		mkdirSync(".omni", { recursive: true });
		writeFileSync(
			LOCAL_CONFIG,
			`
[profiles.default]
capabilities = ["local-only"]
`,
		);

		const config = await loadConfig();
		expect(config.profiles?.default?.capabilities).toEqual(["local-only"]);
	});

	test("merges main and local configs with local taking precedence", async () => {
		mkdirSync(".omni", { recursive: true });
		mkdirSync(".omni", { recursive: true });

		writeFileSync(
			CONFIG_PATH,
			`
[profiles.default]
capabilities = ["tasks"]
`,
		);

		writeFileSync(
			LOCAL_CONFIG,
			`
[profiles.default]
capabilities = ["git"]
`,
		);

		const config = await loadConfig();

		// Profile capabilities from local should override main
		expect(config.profiles?.default?.capabilities).toEqual(["git"]);
	});

	test("merges profiles with local taking precedence", async () => {
		mkdirSync(".omni", { recursive: true });
		mkdirSync(".omni", { recursive: true });

		writeFileSync(
			CONFIG_PATH,
			`
[profiles.dev]
capabilities = ["tasks"]

[profiles.prod]
capabilities = ["git"]
`,
		);

		writeFileSync(
			LOCAL_CONFIG,
			`
[profiles.dev]
capabilities = ["local-tasks"]
`,
		);

		const config = await loadConfig();
		expect(config.profiles?.dev?.capabilities).toEqual(["local-tasks"]);
		expect(config.profiles?.prod?.capabilities).toEqual(["git"]);
	});

	test("handles empty profiles sections gracefully", async () => {
		mkdirSync(".omni", { recursive: true });
		writeFileSync(
			CONFIG_PATH,
			`
`,
		);

		const config = await loadConfig();
		expect(config.profiles).toEqual({});
	});

	test("handles invalid TOML in main config", async () => {
		mkdirSync(".omni", { recursive: true });
		writeFileSync(CONFIG_PATH, "invalid toml [[[");

		await expect(loadConfig()).rejects.toThrow("Invalid TOML in config");
	});

	test("handles invalid TOML in local config", async () => {
		mkdirSync(".omni", { recursive: true });
		writeFileSync(LOCAL_CONFIG, "invalid toml [[[");

		await expect(loadConfig()).rejects.toThrow("Invalid TOML in config");
	});
});
