import { existsSync } from "node:fs";
import type { OmniConfig, CapabilitiesState } from "../types/index.js";

const ACTIVE_PROFILE_FILE = ".omni/active-profile";

/**
 * Gets the name of the currently active profile.
 * Returns null if no profile is set.
 */
export async function getActiveProfile(): Promise<string | null> {
	if (!existsSync(ACTIVE_PROFILE_FILE)) {
		return null;
	}
	const content = await Bun.file(ACTIVE_PROFILE_FILE).text();
	return content.trim();
}

/**
 * Sets the active profile by writing to .omni/active-profile.
 * @param name - The name of the profile to activate
 */
export async function setActiveProfile(name: string): Promise<void> {
	await Bun.write(ACTIVE_PROFILE_FILE, name);
}

/**
 * Resolves the final set of enabled capabilities based on base config and active profile.
 * Profile enable/disable lists modify the base capabilities configuration.
 *
 * @param config - The merged OmniConfig
 * @param profileName - The name of the profile to apply, or null to use default
 * @returns Array of capability IDs that should be enabled
 * @deprecated Use resolveEnabledCapabilitiesFromState instead
 */
export function resolveEnabledCapabilities(
	config: OmniConfig,
	profileName: string | null,
): string[] {
	// Start with base capabilities
	const baseEnabled = new Set(config.capabilities?.enable ?? []);
	const baseDisabled = new Set(config.capabilities?.disable ?? []);

	// Determine which profile to use
	const profile = profileName
		? config.profiles?.[profileName]
		: config.profiles?.[config.default_profile ?? "default"];

	// Apply profile if it exists
	if (profile) {
		for (const cap of profile.enable ?? []) {
			baseEnabled.add(cap);
		}
		for (const cap of profile.disable ?? []) {
			baseDisabled.add(cap);
		}
	}

	// Return enabled minus disabled
	return [...baseEnabled].filter((cap) => !baseDisabled.has(cap));
}

/**
 * Resolves the final set of enabled capabilities based on capabilities state and active profile.
 * Resolution order:
 * 1. Start with capabilities from capabilities.toml
 * 2. Apply profile modifications (enable/disable)
 * 3. Apply explicit disables (highest priority)
 *
 * @param capabilitiesState - The state from capabilities.toml
 * @param config - The merged OmniConfig (for profiles)
 * @param profileName - The name of the profile to apply, or null to use default
 * @returns Array of capability IDs that should be enabled
 */
export function resolveEnabledCapabilitiesFromState(
	capabilitiesState: CapabilitiesState,
	config: OmniConfig,
	profileName: string | null,
): string[] {
	// Start with base capabilities state
	const enabled = new Set(capabilitiesState.enabled ?? []);

	// Determine which profile to use
	const profile = profileName
		? config.profiles?.[profileName]
		: config.profiles?.[config.default_profile ?? "default"];

	// Apply profile if it exists
	if (profile) {
		for (const cap of profile.enable ?? []) {
			enabled.add(cap);
		}
		for (const cap of profile.disable ?? []) {
			enabled.delete(cap);
		}
	}

	// Apply explicit disables (highest priority)
	for (const cap of capabilitiesState.disabled ?? []) {
		enabled.delete(cap);
	}

	return Array.from(enabled);
}
