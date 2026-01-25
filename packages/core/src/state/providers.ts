import { existsSync, mkdirSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import type { ProviderId } from "#types/index";

const STATE_DIR = ".omni/state";
const PROVIDERS_PATH = `${STATE_DIR}/providers.json`;

export interface ProvidersState {
	enabled: ProviderId[];
}

const DEFAULT_PROVIDERS: ProviderId[] = ["claude-code"];

/**
 * Read the enabled providers from local state.
 * Returns default providers if no state file exists.
 */
export async function readEnabledProviders(): Promise<ProviderId[]> {
	if (!existsSync(PROVIDERS_PATH)) {
		return DEFAULT_PROVIDERS;
	}

	try {
		const content = await readFile(PROVIDERS_PATH, "utf-8");
		const state = JSON.parse(content) as ProvidersState;
		return state.enabled.length > 0 ? state.enabled : DEFAULT_PROVIDERS;
	} catch {
		return DEFAULT_PROVIDERS;
	}
}

/**
 * Write enabled providers to local state.
 * @param providers - List of provider IDs to enable
 */
export async function writeEnabledProviders(providers: ProviderId[]): Promise<void> {
	mkdirSync(STATE_DIR, { recursive: true });
	const state: ProvidersState = { enabled: providers };
	await writeFile(PROVIDERS_PATH, `${JSON.stringify(state, null, 2)}\n`, "utf-8");
}

/**
 * Enable a specific provider.
 * @param providerId - The provider to enable
 */
export async function enableProvider(providerId: ProviderId): Promise<void> {
	const current = await readEnabledProviders();
	if (!current.includes(providerId)) {
		await writeEnabledProviders([...current, providerId]);
	}
}

/**
 * Disable a specific provider.
 * @param providerId - The provider to disable
 */
export async function disableProvider(providerId: ProviderId): Promise<void> {
	const current = await readEnabledProviders();
	const filtered = current.filter((p) => p !== providerId);
	await writeEnabledProviders(filtered);
}

/**
 * Check if a provider is enabled.
 * @param providerId - The provider to check
 */
export async function isProviderEnabled(providerId: ProviderId): Promise<boolean> {
	const current = await readEnabledProviders();
	return current.includes(providerId);
}
