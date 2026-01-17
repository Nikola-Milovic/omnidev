import { existsSync } from "node:fs";
import type { LoadedCapability, McpConfig } from "../types";
import type { ResourceManifest } from "../state/manifest";

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
 * Sync .mcp.json with enabled capability MCP servers
 *
 * Each capability with an [mcp] section is registered using its capability ID.
 * Uses the previous manifest to track which MCPs were managed by OmniDev.
 */
export async function syncMcpJson(
	capabilities: LoadedCapability[],
	previousManifest: ResourceManifest,
	options: { silent?: boolean } = {},
): Promise<void> {
	const mcpJson = await readMcpJson();

	// Collect all MCP server names from previous manifest
	const previouslyManagedMcps = new Set<string>();
	for (const resources of Object.values(previousManifest.capabilities)) {
		for (const mcpName of resources.mcps) {
			previouslyManagedMcps.add(mcpName);
		}
	}

	// Remove previously managed MCPs
	for (const serverName of previouslyManagedMcps) {
		delete mcpJson.mcpServers[serverName];
	}

	// Add MCPs from all enabled capabilities
	let addedCount = 0;
	for (const cap of capabilities) {
		if (cap.config.mcp) {
			mcpJson.mcpServers[cap.id] = buildMcpServerConfig(cap.config.mcp);
			addedCount++;
		}
	}

	await writeMcpJson(mcpJson);

	if (!options.silent) {
		console.log(`  - .mcp.json (${addedCount} MCP server(s))`);
	}
}
