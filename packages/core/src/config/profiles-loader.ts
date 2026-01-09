import { existsSync } from "node:fs";
import { parse } from "@iarna/toml";
import type { ProfileConfig } from "../types/index.js";

const PROFILES_PATH = ".omni/profiles.toml";

export interface ProfilesConfig {
	profiles?: Record<string, ProfileConfig>;
}

/**
 * Load profiles from .omni/profiles.toml
 * @returns ProfilesConfig object with all defined profiles
 */
export async function loadProfiles(): Promise<ProfilesConfig> {
	if (!existsSync(PROFILES_PATH)) {
		return { profiles: {} };
	}

	const content = await Bun.file(PROFILES_PATH).text();
	return parseProfiles(content);
}

/**
 * Parse profiles TOML content
 * @param content - Raw TOML string
 * @returns Parsed ProfilesConfig object
 */
export function parseProfiles(content: string): ProfilesConfig {
	const parsed = parse(content);
	return parsed as ProfilesConfig;
}

/**
 * Write profiles configuration to .omni/profiles.toml
 * @param config - ProfilesConfig to write
 */
export async function writeProfiles(config: ProfilesConfig): Promise<void> {
	const lines: string[] = [];

	lines.push("# OmniDev Profiles");
	lines.push("# Define different capability configurations for various workflows");
	lines.push("");
	lines.push("# Each profile can:");
	lines.push('#   enable = ["cap1", "cap2"]   # Add capabilities to those in capabilities.toml');
	lines.push(
		'#   disable = ["cap3"]           # Remove capabilities from those in capabilities.toml',
	);
	lines.push("");

	if (config.profiles) {
		for (const [name, profile] of Object.entries(config.profiles)) {
			lines.push(`[profiles.${name}]`);

			if (profile.enable && profile.enable.length > 0) {
				lines.push(`enable = ${JSON.stringify(profile.enable)}`);
			} else if (profile.enable !== undefined) {
				lines.push("enable = []");
			}

			if (profile.disable && profile.disable.length > 0) {
				lines.push(`disable = ${JSON.stringify(profile.disable)}`);
			} else if (profile.disable !== undefined) {
				lines.push("disable = []");
			}

			lines.push("");
		}
	}

	await Bun.write(PROFILES_PATH, lines.join("\n"));
}

/**
 * Get a specific profile by name
 * @param name - Profile name to retrieve
 * @returns ProfileConfig if found, undefined otherwise
 */
export async function getProfile(name: string): Promise<ProfileConfig | undefined> {
	const profiles = await loadProfiles();
	return profiles.profiles?.[name];
}

/**
 * Create or update a profile
 * @param name - Profile name
 * @param config - Profile configuration
 */
export async function setProfile(name: string, config: ProfileConfig): Promise<void> {
	const profiles = await loadProfiles();
	if (!profiles.profiles) {
		profiles.profiles = {};
	}
	profiles.profiles[name] = config;
	await writeProfiles(profiles);
}

/**
 * Delete a profile by name
 * @param name - Profile name to delete
 * @returns true if profile was deleted, false if it didn't exist
 */
export async function deleteProfile(name: string): Promise<boolean> {
	const profiles = await loadProfiles();
	if (!profiles.profiles?.[name]) {
		return false;
	}
	delete profiles.profiles[name];
	await writeProfiles(profiles);
	return true;
}

/**
 * List all profile names
 * @returns Array of profile names
 */
export async function listProfiles(): Promise<string[]> {
	const profiles = await loadProfiles();
	return Object.keys(profiles.profiles ?? {});
}
