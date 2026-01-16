import { existsSync } from "node:fs";
import type { LoadedCapability, McpConfig } from "../types";

/**
 * MCP server configuration in .mcp.json
 */
export interface McpServerConfig {
	command: string;
	args?: string[];
	env?: Record<string, string>;
}

/**
 * Structure of .mcp.json file
 */
export interface McpJsonConfig {
	mcpServers: Record<string, McpServerConfig>;
}

const MCP_JSON_PATH = ".mcp.json";

/**
 * Check if a server name is managed by OmniDev
 */
export function isOmniDevMcp(serverName: string): boolean {
	return serverName === "omnidev" || serverName.startsWith("omni-");
}

/**
 * Read .mcp.json or return empty config if doesn't exist
 */
export async function readMcpJson(): Promise<McpJsonConfig> {
	if (!existsSync(MCP_JSON_PATH)) {
		return { mcpServers: {} };
	}

	try {
		const content = await Bun.file(MCP_JSON_PATH).text();
		const parsed = JSON.parse(content);
		return {
			mcpServers: parsed.mcpServers || {},
		};
	} catch {
		// If file is invalid JSON, return empty config
		return { mcpServers: {} };
	}
}

/**
 * Write .mcp.json, preserving non-OmniDev entries
 */
export async function writeMcpJson(config: McpJsonConfig): Promise<void> {
	await Bun.write(MCP_JSON_PATH, JSON.stringify(config, null, 2));
}

/**
 * Build MCP server config from capability's mcp section
 */
function buildMcpServerConfig(mcp: McpConfig): McpServerConfig {
	const config: McpServerConfig = {
		command: mcp.command,
	};
	if (mcp.args) {
		config.args = mcp.args;
	}
	if (mcp.env) {
		config.env = mcp.env;
	}
	return config;
}

/**
 * Sync .mcp.json based on sandbox mode
 *
 * When sandboxEnabled = true (default):
 *   - Only "omnidev" MCP server is registered
 *   - Capability MCPs run as children of OmniDev server
 *
 * When sandboxEnabled = false:
 *   - Each capability's MCP is registered as "omni-{capabilityId}"
 *   - OmniDev server is NOT registered
 */
export async function syncMcpJson(
	capabilities: LoadedCapability[],
	sandboxEnabled: boolean,
	options: { silent?: boolean } = {},
): Promise<void> {
	const mcpJson = await readMcpJson();

	// Remove all OmniDev-managed MCPs first
	for (const serverName of Object.keys(mcpJson.mcpServers)) {
		if (isOmniDevMcp(serverName)) {
			delete mcpJson.mcpServers[serverName];
		}
	}

	if (sandboxEnabled) {
		// Add only OmniDev MCP server
		mcpJson.mcpServers["omnidev"] = {
			command: "bunx",
			args: ["omnidev", "serve"],
		};
	} else {
		// Add MCPs from all enabled capabilities
		for (const cap of capabilities) {
			if (cap.config.mcp) {
				mcpJson.mcpServers[`omni-${cap.id}`] = buildMcpServerConfig(cap.config.mcp);
			}
		}
	}

	await writeMcpJson(mcpJson);

	if (!options.silent) {
		const count = Object.keys(mcpJson.mcpServers).filter(isOmniDevMcp).length;
		console.log(`  - .mcp.json (${count} MCP server(s))`);
	}
}
