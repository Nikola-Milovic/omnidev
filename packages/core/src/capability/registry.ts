import type { LoadedCapability, Skill, Rule, Doc } from "../types";
import { discoverCapabilities, loadCapability } from "./loader";
import { loadEnvironment } from "../config/env";
import { resolveEnabledCapabilities, getActiveProfile } from "../config/profiles";
import { loadConfig } from "../config/loader";

/**
 * Registry of loaded capabilities with helper functions.
 */
export interface CapabilityRegistry {
	capabilities: Map<string, LoadedCapability>;
	getCapability(id: string): LoadedCapability | undefined;
	getAllCapabilities(): LoadedCapability[];
	getAllSkills(): Skill[];
	getAllRules(): Rule[];
	getAllDocs(): Doc[];
}

/**
 * Builds a capability registry by discovering, loading, and filtering capabilities.
 * Only enabled capabilities (based on config and active profile) are included.
 *
 * @returns Capability registry with helper functions
 */
export async function buildCapabilityRegistry(): Promise<CapabilityRegistry> {
	const config = await loadConfig();
	const env = await loadEnvironment();
	const activeProfile = await getActiveProfile();
	const enabledIds = resolveEnabledCapabilities(config, activeProfile);

	const capabilityPaths = await discoverCapabilities();
	const capabilities = new Map<string, LoadedCapability>();

	for (const path of capabilityPaths) {
		try {
			const cap = await loadCapability(path, env);

			// Only add if enabled
			if (enabledIds.includes(cap.id)) {
				capabilities.set(cap.id, cap);
			}
		} catch (error) {
			console.error(`Failed to load capability at ${path}:`, error);
		}
	}

	return {
		capabilities,
		getCapability: (id: string) => capabilities.get(id),
		getAllCapabilities: () => [...capabilities.values()],
		getAllSkills: () => [...capabilities.values()].flatMap((c) => c.skills),
		getAllRules: () => [...capabilities.values()].flatMap((c) => c.rules),
		getAllDocs: () => [...capabilities.values()].flatMap((c) => c.docs),
	};
}
