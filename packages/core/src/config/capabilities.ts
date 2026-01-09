import { existsSync } from "node:fs";
import { parse } from "smol-toml";
import type { CapabilitiesState } from "../types/index.js";

const CAPABILITIES_PATH = ".omni/capabilities.toml";

/**
 * Load capabilities state from .omni/capabilities.toml
 * @returns CapabilitiesState with enabled/disabled capability IDs
 */
export async function loadCapabilitiesState(): Promise<CapabilitiesState> {
	if (!existsSync(CAPABILITIES_PATH)) {
		return { enabled: [], disabled: [] };
	}

	const content = await Bun.file(CAPABILITIES_PATH).text();
	try {
		const parsed = parse(content) as CapabilitiesState;
		return {
			enabled: parsed.enabled ?? [],
			disabled: parsed.disabled ?? [],
		};
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		throw new Error(`Invalid TOML in ${CAPABILITIES_PATH}: ${message}`);
	}
}

/**
 * Write capabilities state to .omni/capabilities.toml
 * @param state - The capabilities state to write
 */
export async function writeCapabilitiesState(state: CapabilitiesState): Promise<void> {
	const content = generateCapabilitiesStateToml(state);
	await Bun.write(CAPABILITIES_PATH, content);
}

/**
 * Generate TOML content for capabilities state
 * @param state - The capabilities state
 * @returns TOML string
 */
function generateCapabilitiesStateToml(state: CapabilitiesState): string {
	const enabled = state.enabled ?? [];
	const disabled = state.disabled ?? [];

	return `# OmniDev Capabilities State
# This file tracks which capabilities are currently enabled or disabled.
# Use 'dev capability enable <name>' and 'dev capability disable <name>' to modify.

# Enabled capabilities
enabled = [${enabled.map((id) => `"${id}"`).join(", ")}]

# Explicitly disabled capabilities (overrides profile)
disabled = [${disabled.map((id) => `"${id}"`).join(", ")}]
`;
}

/**
 * Enable a capability by adding it to the enabled list and removing from disabled
 * @param capabilityId - The ID of the capability to enable
 */
export async function enableCapability(capabilityId: string): Promise<void> {
	const state = await loadCapabilitiesState();

	const enabledSet = new Set(state.enabled ?? []);
	const disabledSet = new Set(state.disabled ?? []);

	// Add to enabled, remove from disabled
	enabledSet.add(capabilityId);
	disabledSet.delete(capabilityId);

	await writeCapabilitiesState({
		enabled: Array.from(enabledSet),
		disabled: Array.from(disabledSet),
	});
}

/**
 * Disable a capability by adding it to the disabled list and removing from enabled
 * @param capabilityId - The ID of the capability to disable
 */
export async function disableCapability(capabilityId: string): Promise<void> {
	const state = await loadCapabilitiesState();

	const enabledSet = new Set(state.enabled ?? []);
	const disabledSet = new Set(state.disabled ?? []);

	// Remove from enabled, add to disabled
	enabledSet.delete(capabilityId);
	disabledSet.add(capabilityId);

	await writeCapabilitiesState({
		enabled: Array.from(enabledSet),
		disabled: Array.from(disabledSet),
	});
}
