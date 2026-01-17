import { describe, expect, test } from "bun:test";
import type { LoadedCapability } from "../types";
import { setupTestDir } from "@omnidev-ai/core/test-utils";
import { isOmniDevMcp, readMcpJson, syncMcpJson, writeMcpJson } from "./manager";

describe("mcp-json manager", () => {
	setupTestDir("mcp-json-test-", { chdir: true, createOmniDir: true });

	describe("isOmniDevMcp", () => {
		test("returns true for 'omnidev' server name", () => {
			expect(isOmniDevMcp("omnidev")).toBe(true);
		});

		test("returns true for 'omni-' prefixed server names", () => {
			expect(isOmniDevMcp("omni-tasks")).toBe(true);
			expect(isOmniDevMcp("omni-context7")).toBe(true);
			expect(isOmniDevMcp("omni-my-capability")).toBe(true);
		});

		test("returns false for non-OmniDev server names", () => {
			expect(isOmniDevMcp("myserver")).toBe(false);
			expect(isOmniDevMcp("playwright")).toBe(false);
			expect(isOmniDevMcp("custom-mcp")).toBe(false);
		});

		test("returns false for similar but different names", () => {
			expect(isOmniDevMcp("omnidev-extra")).toBe(false);
			expect(isOmniDevMcp("my-omnidev")).toBe(false);
			expect(isOmniDevMcp("omnisomething")).toBe(false);
		});
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
			await Bun.write(".mcp.json", JSON.stringify(existingConfig));

			const config = await readMcpJson();
			expect(config).toEqual(existingConfig);
		});

		test("handles invalid JSON gracefully", async () => {
			await Bun.write(".mcp.json", "invalid json {{{");

			const config = await readMcpJson();
			expect(config).toEqual({ mcpServers: {} });
		});

		test("handles missing mcpServers field", async () => {
			await Bun.write(".mcp.json", JSON.stringify({ other: "field" }));

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

			const content = await Bun.file(".mcp.json").text();
			expect(JSON.parse(content)).toEqual(config);
		});

		test("overwrites existing .mcp.json", async () => {
			await Bun.write(".mcp.json", JSON.stringify({ mcpServers: { old: { command: "old" } } }));

			const newConfig = {
				mcpServers: {
					new: { command: "new" },
				},
			};

			await writeMcpJson(newConfig);

			const content = await Bun.file(".mcp.json").text();
			expect(JSON.parse(content)).toEqual(newConfig);
		});

		test("formats JSON with indentation", async () => {
			const config = {
				mcpServers: {
					test: { command: "cmd" },
				},
			};

			await writeMcpJson(config);

			const content = await Bun.file(".mcp.json").text();
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

		describe("sandbox enabled mode (default)", () => {
			test("adds only omnidev server when sandbox enabled", async () => {
				const capabilities = [createMockCapability("tasks")];

				await syncMcpJson(capabilities, true, { silent: true });

				const config = await readMcpJson();
				expect(config.mcpServers).toHaveProperty("omnidev");
				expect(config.mcpServers.omnidev).toEqual({
					command: "bunx",
					args: ["omnidev", "serve"],
				});
			});

			test("removes omni- prefixed servers when switching to sandbox enabled", async () => {
				// Pre-populate with omni- entries
				await Bun.write(
					".mcp.json",
					JSON.stringify({
						mcpServers: {
							"omni-tasks": { command: "npx", args: ["tasks-mcp"] },
							"omni-context7": { command: "npx", args: ["context7-mcp"] },
						},
					}),
				);

				const capabilities = [
					createMockCapability("tasks", { command: "npx", args: ["tasks-mcp"] }),
				];

				await syncMcpJson(capabilities, true, { silent: true });

				const config = await readMcpJson();
				expect(config.mcpServers).not.toHaveProperty("omni-tasks");
				expect(config.mcpServers).not.toHaveProperty("omni-context7");
				expect(config.mcpServers).toHaveProperty("omnidev");
			});

			test("preserves user MCPs when sandbox enabled", async () => {
				await Bun.write(
					".mcp.json",
					JSON.stringify({
						mcpServers: {
							myserver: { command: "node", args: ["my-server.js"] },
							playwright: { command: "npx", args: ["@playwright/mcp"] },
						},
					}),
				);

				const capabilities = [createMockCapability("tasks")];

				await syncMcpJson(capabilities, true, { silent: true });

				const config = await readMcpJson();
				expect(config.mcpServers).toHaveProperty("myserver");
				expect(config.mcpServers).toHaveProperty("playwright");
				expect(config.mcpServers).toHaveProperty("omnidev");
			});
		});

		describe("sandbox disabled mode", () => {
			test("adds omni- prefixed servers for MCP capabilities", async () => {
				const capabilities = [
					createMockCapability("context7", {
						command: "npx",
						args: ["-y", "@upstash/context7-mcp"],
					}),
				];

				await syncMcpJson(capabilities, false, { silent: true });

				const config = await readMcpJson();
				expect(config.mcpServers).toHaveProperty("omni-context7");
				expect(config.mcpServers["omni-context7"]).toEqual({
					command: "npx",
					args: ["-y", "@upstash/context7-mcp"],
				});
				expect(config.mcpServers).not.toHaveProperty("omnidev");
			});

			test("does not add entries for capabilities without MCP", async () => {
				const capabilities = [
					createMockCapability("tasks"), // No MCP
					createMockCapability("context7", { command: "npx", args: ["context7-mcp"] }),
				];

				await syncMcpJson(capabilities, false, { silent: true });

				const config = await readMcpJson();
				expect(config.mcpServers).not.toHaveProperty("omni-tasks");
				expect(config.mcpServers).toHaveProperty("omni-context7");
			});

			test("includes env when present in MCP config", async () => {
				const capabilities = [
					createMockCapability("my-cap", {
						command: "node",
						args: ["server.js"],
						env: { API_KEY: "secret", DEBUG: "true" },
					}),
				];

				await syncMcpJson(capabilities, false, { silent: true });

				const config = await readMcpJson();
				expect(config.mcpServers["omni-my-cap"].env).toEqual({
					API_KEY: "secret",
					DEBUG: "true",
				});
			});

			test("removes omnidev server when switching to sandbox disabled", async () => {
				await Bun.write(
					".mcp.json",
					JSON.stringify({
						mcpServers: {
							omnidev: { command: "bunx", args: ["omnidev", "serve"] },
						},
					}),
				);

				const capabilities = [
					createMockCapability("context7", { command: "npx", args: ["context7-mcp"] }),
				];

				await syncMcpJson(capabilities, false, { silent: true });

				const config = await readMcpJson();
				expect(config.mcpServers).not.toHaveProperty("omnidev");
				expect(config.mcpServers).toHaveProperty("omni-context7");
			});

			test("preserves user MCPs when sandbox disabled", async () => {
				await Bun.write(
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

				await syncMcpJson(capabilities, false, { silent: true });

				const config = await readMcpJson();
				expect(config.mcpServers).toHaveProperty("myserver");
				expect(config.mcpServers).toHaveProperty("omni-context7");
			});

			test("results in empty omni entries when no MCP capabilities", async () => {
				const capabilities = [
					createMockCapability("tasks"), // No MCP
					createMockCapability("ralph"), // No MCP
				];

				await syncMcpJson(capabilities, false, { silent: true });

				const config = await readMcpJson();
				const omniEntries = Object.keys(config.mcpServers).filter(isOmniDevMcp);
				expect(omniEntries).toHaveLength(0);
			});
		});

		describe("mode switching", () => {
			test("switching from sandbox disabled to enabled cleans up correctly", async () => {
				// Start in sandbox disabled mode
				const capabilities = [
					createMockCapability("context7", { command: "npx", args: ["context7-mcp"] }),
				];
				await syncMcpJson(capabilities, false, { silent: true });

				let config = await readMcpJson();
				expect(config.mcpServers).toHaveProperty("omni-context7");
				expect(config.mcpServers).not.toHaveProperty("omnidev");

				// Switch to sandbox enabled
				await syncMcpJson(capabilities, true, { silent: true });

				config = await readMcpJson();
				expect(config.mcpServers).not.toHaveProperty("omni-context7");
				expect(config.mcpServers).toHaveProperty("omnidev");
			});

			test("switching from sandbox enabled to disabled cleans up correctly", async () => {
				// Start in sandbox enabled mode
				const capabilities = [
					createMockCapability("context7", { command: "npx", args: ["context7-mcp"] }),
				];
				await syncMcpJson(capabilities, true, { silent: true });

				let config = await readMcpJson();
				expect(config.mcpServers).toHaveProperty("omnidev");
				expect(config.mcpServers).not.toHaveProperty("omni-context7");

				// Switch to sandbox disabled
				await syncMcpJson(capabilities, false, { silent: true });

				config = await readMcpJson();
				expect(config.mcpServers).toHaveProperty("omni-context7");
				expect(config.mcpServers).not.toHaveProperty("omnidev");
			});
		});

		describe("capability toggle (sandbox disabled)", () => {
			test("enabling MCP capability adds its entry", async () => {
				// Start with no MCP capabilities
				await syncMcpJson([createMockCapability("tasks")], false, { silent: true });

				let config = await readMcpJson();
				expect(Object.keys(config.mcpServers).filter(isOmniDevMcp)).toHaveLength(0);

				// Enable MCP capability
				await syncMcpJson(
					[
						createMockCapability("tasks"),
						createMockCapability("context7", { command: "npx", args: ["context7-mcp"] }),
					],
					false,
					{ silent: true },
				);

				config = await readMcpJson();
				expect(config.mcpServers).toHaveProperty("omni-context7");
			});

			test("disabling MCP capability removes its entry", async () => {
				// Start with MCP capability
				await syncMcpJson(
					[createMockCapability("context7", { command: "npx", args: ["context7-mcp"] })],
					false,
					{ silent: true },
				);

				let config = await readMcpJson();
				expect(config.mcpServers).toHaveProperty("omni-context7");

				// Disable the capability (only non-MCP capabilities remain)
				await syncMcpJson([createMockCapability("tasks")], false, { silent: true });

				config = await readMcpJson();
				expect(config.mcpServers).not.toHaveProperty("omni-context7");
			});
		});

		describe("multiple MCP capabilities", () => {
			test("adds all MCP capabilities when sandbox disabled", async () => {
				const capabilities = [
					createMockCapability("context7", { command: "npx", args: ["context7-mcp"] }),
					createMockCapability("playwright", { command: "npx", args: ["playwright-mcp"] }),
					createMockCapability("tasks"), // No MCP
				];

				await syncMcpJson(capabilities, false, { silent: true });

				const config = await readMcpJson();
				expect(config.mcpServers).toHaveProperty("omni-context7");
				expect(config.mcpServers).toHaveProperty("omni-playwright");
				expect(config.mcpServers).not.toHaveProperty("omni-tasks");
			});
		});
	});
});
