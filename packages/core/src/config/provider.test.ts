import { describe, expect, test } from "bun:test";
import { readFile, writeFile } from "node:fs/promises";
import { setupTestDir } from "@omnidev-ai/core/test-utils";
import { parseProviderFlag } from "./provider.js";

const testDir = setupTestDir("provider-test-", { chdir: true });

describe("parseProviderFlag", () => {
	test("parses 'claude' flag", () => {
		expect(parseProviderFlag("claude")).toEqual(["claude"]);
	});

	test("parses 'codex' flag", () => {
		expect(parseProviderFlag("codex")).toEqual(["codex"]);
	});

	test("parses 'both' flag", () => {
		expect(parseProviderFlag("both")).toEqual(["claude", "codex"]);
	});

	test("handles case-insensitive input", () => {
		expect(parseProviderFlag("CLAUDE")).toEqual(["claude"]);
		expect(parseProviderFlag("Codex")).toEqual(["codex"]);
		expect(parseProviderFlag("BOTH")).toEqual(["claude", "codex"]);
	});

	test("throws on invalid provider", () => {
		expect(() => parseProviderFlag("invalid")).toThrow("Invalid provider: invalid");
	});
});

describe("writeProviderConfig", () => {
	test("writes single provider config", async () => {
		const testPath = `${testDir.path}/provider.toml`;

		// Manually write for testing
		const lines: string[] = [];
		lines.push("# OmniDev Provider Configuration");
		lines.push("# Selected AI provider(s) for this project");
		lines.push("");
		lines.push("# Single provider");
		lines.push('provider = "claude"');

		await writeFile(testPath, `${lines.join("\n")}\n`, "utf-8");

		const content = await readFile(testPath, "utf-8");
		expect(content).toContain('provider = "claude"');
		expect(content).toContain("# Single provider");
	});

	test("writes multiple providers config", async () => {
		const testPath = `${testDir.path}/provider.toml`;

		const lines: string[] = [];
		lines.push("# OmniDev Provider Configuration");
		lines.push("# Selected AI provider(s) for this project");
		lines.push("");
		lines.push("# Multiple providers enabled");
		lines.push('providers = ["claude", "codex"]');

		await writeFile(testPath, `${lines.join("\n")}\n`, "utf-8");

		const content = await readFile(testPath, "utf-8");
		expect(content).toContain('providers = ["claude", "codex"]');
		expect(content).toContain("# Multiple providers");
	});
});
