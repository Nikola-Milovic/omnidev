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
import { mkdirSync, appendFileSync } from "node:fs";

const LOG_FILE = ".omni/logs/mcp-server.log";

/**
 * Debug logger that writes to stderr and log file
 */
function debug(message: string, data?: unknown): void {
	const timestamp = new Date().toISOString();
	let logLine: string;

	if (data !== undefined) {
		logLine = `[${timestamp}] [omnidev] ${message} ${JSON.stringify(data, null, 2)}`;
	} else {
		logLine = `[${timestamp}] [omnidev] ${message}`;
	}

	// Write to stderr
	console.error(logLine);

	// Write to log file
	try {
		mkdirSync(".omni/logs", { recursive: true });
		appendFileSync(LOG_FILE, `${logLine}\n`);
	} catch (error) {
		// If logging fails, just continue
		console.error(`Failed to write to log file: ${error}`);
	}
}

/**
 * Start the MCP server with stdio transport
 */
export async function startServer(): Promise<void> {
	try {
		debug("Starting MCP server...");

		// Build capability registry
		debug("Building capability registry...");
		let registry: Awaited<ReturnType<typeof buildCapabilityRegistry>>;
		try {
			registry = await buildCapabilityRegistry();
			debug(`Capability registry built with ${registry.getAllCapabilities().length} capabilities`);
		} catch (error) {
			debug("Failed to build capability registry", {
				error: error instanceof Error ? error.message : String(error),
				stack: error instanceof Error ? error.stack : undefined,
			});
			throw error;
		}

		// Create MCP server instance
		debug("Creating MCP server instance...");
		const server = new McpServer({
			name: "omnidev",
			version: "0.1.0",
		});

		// Register omni_query tool
		debug("Registering omni_query tool...");
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
				debug("omni_query tool called", args);
				try {
					const result = await handleOmniQuery(registry, args);
					debug("omni_query tool completed successfully");
					return result;
				} catch (error) {
					debug("omni_query tool failed", {
						error: error instanceof Error ? error.message : String(error),
						stack: error instanceof Error ? error.stack : undefined,
					});
					throw error;
				}
			},
		);

		// Register omni_execute tool
		debug("Registering omni_execute tool...");
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
				debug("omni_execute tool called", { codeLength: args.code?.length });
				try {
					const result = await handleOmniExecute(registry, args);
					debug("omni_execute tool completed successfully");
					return result;
				} catch (error) {
					debug("omni_execute tool failed", {
						error: error instanceof Error ? error.message : String(error),
						stack: error instanceof Error ? error.stack : undefined,
					});
					throw error;
				}
			},
		);

		// Setup sandbox symlinks
		debug("Setting up sandbox symlinks...");
		await setupSandbox(registry.getAllCapabilities());
		debug("Sandbox setup complete");

		// Write PID file
		debug("Writing PID file...");
		mkdirSync(".omni/state", { recursive: true });
		await Bun.write(".omni/state/server.pid", process.pid.toString());
		debug(`PID file written: ${process.pid}`);

		// Start file watcher for hot reload
		debug("Starting file watcher...");
		startWatcher(async () => {
			debug("Reloading capabilities...");
			registry = await buildCapabilityRegistry();
			await setupSandbox(registry.getAllCapabilities());
			debug("Capabilities reloaded");
		});

		// Handle shutdown
		const shutdown = async () => {
			debug("Shutting down...");
			try {
				const pidFile = Bun.file(".omni/state/server.pid");
				await pidFile.delete();
			} catch {
				// Ignore errors if file doesn't exist
			}
			process.exit(0);
		};

		process.on("SIGINT", shutdown);
		process.on("SIGTERM", shutdown);

		// Handle uncaught errors to prevent silent crashes
		process.on("uncaughtException", (error) => {
			debug("Uncaught exception", {
				error: error.message,
				stack: error.stack,
			});
			// Don't exit, let the server continue
		});

		process.on("unhandledRejection", (reason) => {
			debug("Unhandled rejection", {
				reason: reason instanceof Error ? reason.message : String(reason),
				stack: reason instanceof Error ? reason.stack : undefined,
			});
			// Don't exit, let the server continue
		});

		// Start MCP server with stdio transport
		debug("Creating stdio transport...");
		const transport = new StdioServerTransport();

		debug("Connecting server to transport...");
		await server.connect(transport);

		debug("MCP server started and ready to accept requests");
	} catch (error) {
		debug("Fatal error during server startup", {
			error: error instanceof Error ? error.message : String(error),
			stack: error instanceof Error ? error.stack : undefined,
		});
		throw error;
	}
}
