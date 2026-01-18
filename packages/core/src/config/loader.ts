import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import type { OmniConfig } from "../types";
import { parseOmniConfig } from "./parser";

const CONFIG_PATH = "omni.toml";
const LOCAL_CONFIG = "omni.local.toml";

/**
 * Deep merge two config objects, with override taking precedence
 * @param base - The base config object
 * @param override - The override config object
 * @returns Merged config with override values taking precedence
 */
function mergeConfigs(base: OmniConfig, override: OmniConfig): OmniConfig {
	const merged: OmniConfig = { ...base, ...override };

	// Deep merge env
	merged.env = { ...base.env, ...override.env };

	// Deep merge profiles
	merged.profiles = { ...base.profiles };
	for (const [name, profile] of Object.entries(override.profiles || {})) {
		merged.profiles[name] = {
			...(base.profiles?.[name] || {}),
			...profile,
		};
	}

	// Deep merge mcps (only if at least one config has it)
	if (base.mcps || override.mcps) {
		merged.mcps = { ...base.mcps, ...override.mcps };
	}

	return merged;
}

/**
 * Load and merge config and local configuration files
 * @returns Merged OmniConfig object
 *
 * Reads omni.toml (main config) and omni.local.toml (local overrides).
 * Local config takes precedence over main config. Missing files are treated as empty configs.
 */
export async function loadConfig(): Promise<OmniConfig> {
	let baseConfig: OmniConfig = {};
	let localConfig: OmniConfig = {};

	if (existsSync(CONFIG_PATH)) {
		const content = await readFile(CONFIG_PATH, "utf-8");
		baseConfig = parseOmniConfig(content);
	}

	if (existsSync(LOCAL_CONFIG)) {
		const content = await readFile(LOCAL_CONFIG, "utf-8");
		localConfig = parseOmniConfig(content);
	}

	return mergeConfigs(baseConfig, localConfig);
}

/**
 * Write config to omni.toml at project root
 * @param config - The config object to write
 */
export async function writeConfig(config: OmniConfig): Promise<void> {
	const content = generateConfigToml(config);
	await writeFile(CONFIG_PATH, content, "utf-8");
}

/**
 * Generate TOML content for OmniConfig
 * @param config - The config object
 * @returns TOML string
 */
function generateConfigToml(config: OmniConfig): string {
	const lines: string[] = [];

	lines.push("# =============================================================================");
	lines.push("# OmniDev Configuration");
	lines.push("# =============================================================================");
	lines.push("# This file defines your project's capabilities, profiles, and settings.");
	lines.push("#");
	lines.push("# Files:");
	lines.push("#   • omni.toml - Main config (commit to share with team)");
	lines.push("#   • omni.local.toml - Local overrides (add to .gitignore)");
	lines.push("#   • omni.lock.toml - Version lock file (commit for reproducibility)");
	lines.push("#");
	lines.push("# Quick start:");
	lines.push("#   1. Add capability sources to [capabilities.sources]");
	lines.push("#   2. Reference them in your profiles");
	lines.push("#   3. Run: omnidev sync");
	lines.push("#   4. Switch profiles: omnidev profile use <name>");
	lines.push("");

	// Project name
	if (config.project) {
		lines.push(`project = "${config.project}"`);
		lines.push("");
	}

	// Note: active_profile is stored in .omni/state/active-profile, not in config.toml
	// We still read it from config.toml for backwards compatibility, but don't write it here

	// Providers
	if (config.providers?.enabled && config.providers.enabled.length > 0) {
		lines.push("# AI providers to enable (claude, codex, or both)");
		lines.push("[providers]");
		lines.push(`enabled = [${config.providers.enabled.map((p) => `"${p}"`).join(", ")}]`);
		lines.push("");
	}

	// Environment variables
	lines.push("# =============================================================================");
	lines.push("# Environment Variables");
	lines.push("# =============================================================================");
	lines.push("# Global environment variables available to all capabilities.");
	// biome-ignore lint/suspicious/noTemplateCurlyInString: Example of env var syntax
	lines.push("# Use ${VAR_NAME} syntax to reference shell environment variables.");
	lines.push("#");
	if (config.env && Object.keys(config.env).length > 0) {
		lines.push("[env]");
		for (const [key, value] of Object.entries(config.env)) {
			lines.push(`${key} = "${value}"`);
		}
	} else {
		lines.push("# [env]");
		// biome-ignore lint/suspicious/noTemplateCurlyInString: Example of env var syntax
		lines.push('# DATABASE_URL = "${DATABASE_URL}"');
		// biome-ignore lint/suspicious/noTemplateCurlyInString: Example of env var syntax
		lines.push('# API_KEY = "${MY_API_KEY}"');
	}
	lines.push("");

	// Capability sources (commented examples)
	lines.push("# =============================================================================");
	lines.push("# Capability Sources");
	lines.push("# =============================================================================");
	lines.push("# Fetch capabilities from Git repositories. On sync, these are");
	lines.push("# cloned/updated and made available to your profiles.");
	lines.push("#");
	lines.push("# [capabilities.sources]");
	lines.push("# # GitHub shorthand (uses latest commit)");
	lines.push('# tasks = "github:example-org/tasks-capability"');
	lines.push("#");
	lines.push("# # Version pinning (recommended for production)");
	lines.push('# ralph = { source = "github:example-org/ralph", ref = "v1.2.0" }');
	lines.push("#");
	lines.push("# # Other Git sources");
	lines.push('# private = "git@github.com:company/private-cap.git"');
	lines.push('# gitlab = "https://gitlab.com/user/capability.git"');
	lines.push("");

	// MCP servers (commented examples)
	lines.push("# =============================================================================");
	lines.push("# MCP Servers");
	lines.push("# =============================================================================");
	lines.push("# Define MCP servers that automatically become capabilities.");
	lines.push(
		'# Reference in profiles using the MCP name directly, e.g. capabilities = ["filesystem"]',
	);
	lines.push("#");
	lines.push("# [mcps.filesystem]");
	lines.push('# command = "npx"');
	lines.push('# args = ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/dir"]');
	lines.push('# transport = "stdio"  # stdio (default), sse, or http');
	lines.push("#");
	lines.push("# [mcps.database]");
	lines.push('# command = "node"');
	lines.push('# args = ["./servers/database.js"]');
	lines.push('# cwd = "./mcp-servers"');
	lines.push("# [mcps.database.env]");
	// biome-ignore lint/suspicious/noTemplateCurlyInString: Example of env var syntax
	lines.push('# DB_URL = "${DATABASE_URL}"');
	lines.push("");

	// Always enabled capabilities
	lines.push("# =============================================================================");
	lines.push("# Always Enabled Capabilities");
	lines.push("# =============================================================================");
	lines.push("# Capabilities that load in ALL profiles, regardless of profile config.");
	lines.push("# Useful for essential tools needed everywhere.");
	lines.push("#");
	lines.push('# always_enabled_capabilities = ["git-tools", "linting"]');
	lines.push("");

	// Profiles
	lines.push("# =============================================================================");
	lines.push("# Profiles");
	lines.push("# =============================================================================");
	lines.push("# Define different capability sets for different workflows.");
	lines.push("# Switch profiles with: omnidev profile use <name>");
	lines.push("");
	if (config.profiles && Object.keys(config.profiles).length > 0) {
		for (const [name, profile] of Object.entries(config.profiles)) {
			lines.push(`[profiles.${name}]`);
			const capabilities = profile.capabilities ?? [];
			if (capabilities.length > 0) {
				lines.push(`capabilities = [${capabilities.map((id) => `"${id}"`).join(", ")}]`);
			} else {
				lines.push("capabilities = []");
			}
			lines.push("");
		}
	}

	return lines.join("\n");
}
