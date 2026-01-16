import { existsSync, mkdirSync, rmSync } from "node:fs";
import type { LoadedCapability } from "../types";

/**
 * MCP entry for a capability
 */
export interface McpEntry {
	/** Server name in .mcp.json (e.g., "omni-{capabilityId}") */
	serverName: string;
	/** Command to run the MCP server */
	command: string;
	/** Arguments for the command */
	args?: string[];
	/** Environment variables */
	env?: Record<string, string>;
}

/**
 * Resources provided by a single capability
 */
export interface CapabilityResources {
	skills: string[];
	rules: string[];
	commands: string[];
	subagents: string[];
	/** MCP configuration if capability has [mcp] section */
	mcp?: McpEntry;
}

/**
 * Manifest tracking which resources each capability provides.
 * Used to clean up stale resources when capabilities are disabled.
 */
export interface ResourceManifest {
	/** Schema version for future migrations */
	version: 1;
	/** Last sync timestamp (ISO 8601) */
	syncedAt: string;
	/** Map of capability ID → resources it provides */
	capabilities: Record<string, CapabilityResources>;
}

/**
 * Result of cleaning up stale resources
 */
export interface CleanupResult {
	deletedSkills: string[];
	deletedRules: string[];
	deletedCommands: string[];
	deletedSubagents: string[];
}

const MANIFEST_PATH = ".omni/state/manifest.json";
const CURRENT_VERSION = 1;

/**
 * Load the previous manifest from disk.
 * Returns an empty manifest if the file doesn't exist.
 */
export async function loadManifest(): Promise<ResourceManifest> {
	if (!existsSync(MANIFEST_PATH)) {
		return {
			version: CURRENT_VERSION,
			syncedAt: new Date().toISOString(),
			capabilities: {},
		};
	}

	const content = await Bun.file(MANIFEST_PATH).text();
	return JSON.parse(content) as ResourceManifest;
}

/**
 * Save the manifest to disk.
 */
export async function saveManifest(manifest: ResourceManifest): Promise<void> {
	mkdirSync(".omni/state", { recursive: true });
	await Bun.write(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
}

/**
 * Build a manifest from the current registry capabilities.
 */
export function buildManifestFromCapabilities(capabilities: LoadedCapability[]): ResourceManifest {
	const manifest: ResourceManifest = {
		version: CURRENT_VERSION,
		syncedAt: new Date().toISOString(),
		capabilities: {},
	};

	for (const cap of capabilities) {
		const resources: CapabilityResources = {
			skills: cap.skills.map((s) => s.name),
			rules: cap.rules.map((r) => r.name),
			commands: cap.commands.map((c) => c.name),
			subagents: cap.subagents.map((s) => s.name),
		};

		// Track MCP if capability has one
		if (cap.config.mcp) {
			const mcpEntry: McpEntry = {
				serverName: `omni-${cap.id}`,
				command: cap.config.mcp.command,
			};
			if (cap.config.mcp.args) {
				mcpEntry.args = cap.config.mcp.args;
			}
			if (cap.config.mcp.env) {
				mcpEntry.env = cap.config.mcp.env;
			}
			resources.mcp = mcpEntry;
		}

		manifest.capabilities[cap.id] = resources;
	}

	return manifest;
}

/**
 * Delete resources for capabilities that are no longer enabled.
 * Compares the previous manifest against current capability IDs
 * and removes files/directories for capabilities not in the current set.
 */
export async function cleanupStaleResources(
	previousManifest: ResourceManifest,
	currentCapabilityIds: Set<string>,
): Promise<CleanupResult> {
	const result: CleanupResult = {
		deletedSkills: [],
		deletedRules: [],
		deletedCommands: [],
		deletedSubagents: [],
	};

	for (const [capId, resources] of Object.entries(previousManifest.capabilities)) {
		// Skip if capability is still enabled
		if (currentCapabilityIds.has(capId)) {
			continue;
		}

		// Delete skills (directories)
		for (const skillName of resources.skills) {
			const skillDir = `.claude/skills/${skillName}`;
			if (existsSync(skillDir)) {
				rmSync(skillDir, { recursive: true });
				result.deletedSkills.push(skillName);
			}
		}

		// Delete rules (individual files)
		for (const ruleName of resources.rules) {
			const rulePath = `.cursor/rules/omnidev-${ruleName}.mdc`;
			if (existsSync(rulePath)) {
				rmSync(rulePath);
				result.deletedRules.push(ruleName);
			}
		}

		// Future: Delete commands and subagents if they become file-based
	}

	return result;
}
