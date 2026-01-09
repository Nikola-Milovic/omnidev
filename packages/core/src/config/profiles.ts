import { existsSync } from 'node:fs';
import type { OmniConfig } from '../types/index.js';

const ACTIVE_PROFILE_FILE = '.omni/active-profile';

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
		: config.profiles?.[config.default_profile ?? 'default'];

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
