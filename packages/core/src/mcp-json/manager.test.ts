import { describe, expect, test } from "bun:test";
import { readFile, writeFile } from "node:fs/promises";
import type { LoadedCapability } from "../types";
import type { ResourceManifest } from "../state/manifest";
import { setupTestDir } from "@omnidev-ai/core/test-utils";
import { readMcpJson, syncMcpJson, writeMcpJson } from "./manager";

async function writeTextFile(path: string, content: string): Promise<void> {
	await writeFile(path, content, "utf-8");
}

async function readTextFile(path: string): Promise<string> {
	return await readFile(path, "utf-8");
}

describe("mcp-json manager", () => {
	setupTestDir("mcp-json-test-", { chdir: true, createOmniDir: true });

	const createEmptyManifest = (): ResourceManifest => ({
		version: 1,
		syncedAt: new Date().toISOString(),
		capabilities: {},
	});

	describe("readMcpJson", () => {
		test("returns empty config when file does not exist", async () => {
			const config = await readMcpJson();
			expect(config).toEqual({ mcpServers: {} });
		});

		test("reads existing .mcp.json file", async () => {
			const existingConfig = {
				mcpServers: {
					myserver: {
						command: "node",
						args: ["server.js"],
					},
				},
			};
			await writeTextFile(".mcp.json", JSON.stringify(existingConfig));

			const config = await readMcpJson();
			expect(config).toEqual(existingConfig);
		});

		test("handles invalid JSON gracefully", async () => {
			await writeTextFile(".mcp.json", "invalid json {{{");

			const config = await readMcpJson();
			expect(config).toEqual({ mcpServers: {} });
		});

		test("handles missing mcpServers field", async () => {
			await writeTextFile(".mcp.json", JSON.stringify({ other: "field" }));

			const config = await readMcpJson();
			expect(config).toEqual({ mcpServers: {} });
		});
	});

	describe("writeMcpJson", () => {
		test("writes config to .mcp.json", async () => {
			const config = {
				mcpServers: {
					test: {
						command: "test-cmd",
						args: ["arg1", "arg2"],
					},
				},
			};

			await writeMcpJson(config);

			const content = await readTextFile(".mcp.json");
			expect(JSON.parse(content)).toEqual(config);
		});

		test("overwrites existing .mcp.json", async () => {
			await writeTextFile(".mcp.json", JSON.stringify({ mcpServers: { old: { command: "old" } } }));

			const newConfig = {
				mcpServers: {
					new: { command: "new" },
				},
			};

			await writeMcpJson(newConfig);

			const content = await readTextFile(".mcp.json");
			expect(JSON.parse(content)).toEqual(newConfig);
		});

		test("formats JSON with indentation", async () => {
			const config = {
				mcpServers: {
					test: { command: "cmd" },
				},
			};

			await writeMcpJson(config);

			const content = await readTextFile(".mcp.json");
			expect(content).toContain("\n");
			expect(content).toContain("  ");
		});
	});

	describe("syncMcpJson", () => {
		const createMockCapability = (
			id: string,
			mcp?: { command: string; args?: string[]; env?: Record<string, string> },
		): LoadedCapability => ({
			id,
			path: `/path/to/${id}`,
			config: {
				capability: { id, name: id, version: "1.0.0", description: "" },
				mcp,
			},
			skills: [],
			rules: [],
			docs: [],
			subagents: [],
			commands: [],
			exports: {},
		});

		describe("MCP wrapping", () => {
			test("adds MCP servers using capability ID", async () => {
				const capabilities = [
					createMockCapability("context7", {
						command: "npx",
						args: ["-y", "@upstash/context7-mcp"],
					}),
				];

				await syncMcpJson(capabilities, createEmptyManifest(), { silent: true });

				const config = await readMcpJson();
				expect(config.mcpServers).toHaveProperty("context7");
				expect(config.mcpServers["context7"]).toEqual({
					command: "npx",
					args: ["-y", "@upstash/context7-mcp"],
				});
			});

			test("does not add entries for capabilities without MCP", async () => {
				const capabilities = [
					createMockCapability("tasks"), // No MCP
					createMockCapability("context7", { command: "npx", args: ["context7-mcp"] }),
				];

				await syncMcpJson(capabilities, createEmptyManifest(), { silent: true });

				const config = await readMcpJson();
				expect(config.mcpServers).not.toHaveProperty("tasks");
				expect(config.mcpServers).toHaveProperty("context7");
			});

			test("includes env when present in MCP config", async () => {
				const capabilities = [
					createMockCapability("my-cap", {
						command: "node",
						args: ["server.js"],
						env: { API_KEY: "secret", DEBUG: "true" },
					}),
				];

				await syncMcpJson(capabilities, createEmptyManifest(), { silent: true });

				const config = await readMcpJson();
				expect(config.mcpServers["my-cap"].env).toEqual({
					API_KEY: "secret",
					DEBUG: "true",
				});
			});

			test("removes previously managed MCP from manifest", async () => {
				// Setup: pre-populate .mcp.json with an old MCP
				await writeTextFile(
					".mcp.json",
					JSON.stringify({
						mcpServers: {
							oldcap: { command: "npx", args: ["old-mcp"] },
							userserver: { command: "node", args: ["user.js"] },
						},
					}),
				);

				// Previous manifest tracks oldcap as managed
				const previousManifest: ResourceManifest = {
					version: 1,
					syncedAt: new Date().toISOString(),
					capabilities: {
						oldcap: { skills: [], rules: [], commands: [], subagents: [], mcps: ["oldcap"] },
					},
				};

				const capabilities = [
					createMockCapability("context7", { command: "npx", args: ["context7-mcp"] }),
				];

				await syncMcpJson(capabilities, previousManifest, { silent: true });

				const config = await readMcpJson();
				expect(config.mcpServers).not.toHaveProperty("oldcap"); // Removed (was managed)
				expect(config.mcpServers).toHaveProperty("userserver"); // Preserved (not managed)
				expect(config.mcpServers).toHaveProperty("context7"); // Added
			});

			test("preserves user MCPs", async () => {
				await writeTextFile(
					".mcp.json",
					JSON.stringify({
						mcpServers: {
							myserver: { command: "node", args: ["my-server.js"] },
						},
					}),
				);

				const capabilities = [
					createMockCapability("context7", { command: "npx", args: ["context7-mcp"] }),
				];

				await syncMcpJson(capabilities, createEmptyManifest(), { silent: true });

				const config = await readMcpJson();
				expect(config.mcpServers).toHaveProperty("myserver");
				expect(config.mcpServers).toHaveProperty("context7");
			});

			test("does not add entries when no MCP capabilities", async () => {
				const capabilities = [
					createMockCapability("tasks"), // No MCP
					createMockCapability("ralph"), // No MCP
				];

				await syncMcpJson(capabilities, createEmptyManifest(), { silent: true });

				const config = await readMcpJson();
				expect(config.mcpServers).not.toHaveProperty("tasks");
				expect(config.mcpServers).not.toHaveProperty("ralph");
			});
		});

		describe("capability toggle", () => {
			test("enabling MCP capability adds its entry", async () => {
				// Start with no MCP capabilities
				let manifest = createEmptyManifest();
				await syncMcpJson([createMockCapability("tasks")], manifest, { silent: true });

				let config = await readMcpJson();
				expect(Object.keys(config.mcpServers)).toHaveLength(0);

				// Enable MCP capability - update manifest to track tasks (no mcps)
				manifest = {
					version: 1,
					syncedAt: new Date().toISOString(),
					capabilities: {
						tasks: { skills: [], rules: [], commands: [], subagents: [], mcps: [] },
					},
				};
				await syncMcpJson(
					[
						createMockCapability("tasks"),
						createMockCapability("context7", { command: "npx", args: ["context7-mcp"] }),
					],
					manifest,
					{ silent: true },
				);

				config = await readMcpJson();
				expect(config.mcpServers).toHaveProperty("context7");
			});

			test("disabling MCP capability removes its entry", async () => {
				// Start with MCP capability
				let manifest = createEmptyManifest();
				await syncMcpJson(
					[createMockCapability("context7", { command: "npx", args: ["context7-mcp"] })],
					manifest,
					{ silent: true },
				);

				let config = await readMcpJson();
				expect(config.mcpServers).toHaveProperty("context7");

				// Disable the capability - manifest now tracks context7 with its MCP
				manifest = {
					version: 1,
					syncedAt: new Date().toISOString(),
					capabilities: {
						context7: { skills: [], rules: [], commands: [], subagents: [], mcps: ["context7"] },
					},
				};
				await syncMcpJson([createMockCapability("tasks")], manifest, { silent: true });

				config = await readMcpJson();
				expect(config.mcpServers).not.toHaveProperty("context7");
			});
		});

		describe("multiple MCP capabilities", () => {
			test("adds all MCP capabilities", async () => {
				const capabilities = [
					createMockCapability("context7", { command: "npx", args: ["context7-mcp"] }),
					createMockCapability("playwright", { command: "npx", args: ["playwright-mcp"] }),
					createMockCapability("tasks"), // No MCP
				];

				await syncMcpJson(capabilities, createEmptyManifest(), { silent: true });

				const config = await readMcpJson();
				expect(config.mcpServers).toHaveProperty("context7");
				expect(config.mcpServers).toHaveProperty("playwright");
				expect(config.mcpServers).not.toHaveProperty("tasks");
			});
		});
	});
});
