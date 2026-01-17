#!/usr/bin/env bun
/**
 * Demo MCP Server
 *
 * A minimal MCP server that exposes a single "hello-world" tool.
 * Used for OmniDev integration testing.
 *
 * FIXTURE_MARKER:DEMO_MCP
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const server = new McpServer({
	name: "demo-mcp",
	version: "1.0.0",
});

// Register a simple hello-world tool
server.tool(
	"hello-world",
	"A demo tool that returns a greeting. Used for testing MCP integration.",
	{
		name: z.string().optional().describe("Name to greet (optional)"),
	},
	async ({ name }) => {
		const greeting = name ? `Hello, ${name}!` : "Hello, World!";
		return {
			content: [
				{
					type: "text",
					text: `FIXTURE_MARKER:DEMO_MCP_RESPONSE - ${greeting}`,
				},
			],
		};
	},
);

// Start the server with stdio transport
const transport = new StdioServerTransport();
await server.connect(transport);
