/**
 * MCP Server for OmniDev
 *
 * Provides omni_query and omni_execute tools to LLMs via Model Context Protocol
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import * as z from "zod";
import { buildCapabilityRegistry } from "@omnidev/core";
import { handleOmniQuery } from "./tools/query.js";
import { handleOmniExecute } from "./tools/execute.js";
import { setupSandbox } from "./sandbox.js";
import { startWatcher } from "./watcher.js";
import { mkdirSync } from "node:fs";

/**
 * Start the MCP server with stdio transport
 */
export async function startServer(): Promise<void> {
	// Build capability registry
	let registry = await buildCapabilityRegistry();

	// Create MCP server instance
	const server = new McpServer({
		name: "omnidev",
		version: "0.1.0",
	});

	// Register omni_query tool
	server.registerTool(
		"omni_query",
		{
			title: "Query OmniDev Capabilities",
			description:
				"Search capabilities, docs, and skills. Returns type definitions when include_types is true.",
			inputSchema: {
				query: z
					.string()
					.optional()
					.describe("Search query. Empty returns summary of enabled capabilities."),
				limit: z.number().optional().describe("Maximum results to return (default: 10)"),
				include_types: z
					.boolean()
					.optional()
					.describe("Include TypeScript type definitions in response"),
			},
		},
		async (args) => {
			return await handleOmniQuery(registry, args);
		},
	);

	// Register omni_execute tool
	server.registerTool(
		"omni_execute",
		{
			title: "Execute TypeScript Code",
			description: "Execute TypeScript code in the sandbox with access to capability modules.",
			inputSchema: {
				code: z
					.string()
					.describe(
						"Full TypeScript file contents with export async function main(): Promise<number>",
					),
			},
		},
		async (args) => {
			return await handleOmniExecute(registry, args);
		},
	);

	// Setup sandbox symlinks
	await setupSandbox(registry.getAllCapabilities());

	// Write PID file
	mkdirSync(".omni", { recursive: true });
	await Bun.write(".omni/server.pid", process.pid.toString());

	// Start file watcher for hot reload
	startWatcher(async () => {
		console.error("[omnidev] Reloading capabilities...");
		registry = await buildCapabilityRegistry();
		await setupSandbox(registry.getAllCapabilities());
	});

	// Handle shutdown
	const shutdown = async () => {
		console.error("[omnidev] Shutting down...");
		try {
			const pidFile = Bun.file(".omni/server.pid");
			await pidFile.delete();
		} catch {
			// Ignore errors if file doesn't exist
		}
		process.exit(0);
	};

	process.on("SIGINT", shutdown);
	process.on("SIGTERM", shutdown);

	// Start MCP server with stdio transport
	const transport = new StdioServerTransport();
	await server.connect(transport);

	console.error("[omnidev] MCP server started");
}
