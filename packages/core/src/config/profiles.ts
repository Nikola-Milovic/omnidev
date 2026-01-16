import { readActiveProfileState, writeActiveProfileState } from "../state/active-profile.js";
import type { OmniConfig, ProfileConfig } from "../types/index.js";
import { loadConfig, writeConfig } from "./loader.js";

/**
 * Gets the name of the currently active profile.
 * Reads from state file first, falls back to config.toml for backwards compatibility.
 * Returns null if no profile is set.
 */
export async function getActiveProfile(): Promise<string | null> {
	// First check state file (new location)
	const stateProfile = await readActiveProfileState();
	if (stateProfile) {
		return stateProfile;
	}

	// Fall back to config.toml for backwards compatibility
	const config = await loadConfig();
	return config.active_profile ?? null;
}

/**
 * Sets the active profile by writing to state file.
 * @param name - The name of the profile to activate
 */
export async function setActiveProfile(name: string): Promise<void> {
	await writeActiveProfileState(name);
}

/**
 * Resolves the enabled capabilities for a given profile
 *
 * @param config - The merged OmniConfig
 * @param profileName - The name of the profile to apply, or null to use active
 * @returns Array of capability IDs that should be enabled
 */
export function resolveEnabledCapabilities(
	config: OmniConfig,
	profileName: string | null,
): string[] {
	// Determine which profile to use
	const profile = profileName
		? config.profiles?.[profileName]
		: config.profiles?.[config.active_profile ?? "default"];

	const profileCapabilities = profile?.capabilities ?? [];
	const alwaysEnabled = config.always_enabled_capabilities ?? [];

	// Merge always-enabled capabilities with profile capabilities (no duplicates)
	return [...new Set([...alwaysEnabled, ...profileCapabilities])];
}

/**
 * Load a specific profile configuration from config.toml
 * @param profileName - Name of the profile to load
 * @returns ProfileConfig if found, undefined otherwise
 */
export async function loadProfileConfig(profileName: string): Promise<ProfileConfig | undefined> {
	const config = await loadConfig();
	return config.profiles?.[profileName];
}

/**
 * Set a profile configuration in config.toml
 * @param profileName - Name of the profile to set
 * @param profileConfig - Profile configuration
 */
export async function setProfile(profileName: string, profileConfig: ProfileConfig): Promise<void> {
	const config = await loadConfig();
	if (!config.profiles) {
		config.profiles = {};
	}
	config.profiles[profileName] = profileConfig;
	await writeConfig(config);
}
