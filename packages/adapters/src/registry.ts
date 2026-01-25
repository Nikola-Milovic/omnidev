import type { ProviderAdapter, ProviderId } from "@omnidev-ai/core";
import { readEnabledProviders } from "@omnidev-ai/core";
import { claudeCodeAdapter } from "./claude-code/index";
import { codexAdapter } from "./codex/index";
import { cursorAdapter } from "./cursor/index";
import { opencodeAdapter } from "./opencode/index";

export interface AdapterRegistry {
	adapters: Map<ProviderId, ProviderAdapter>;
	get(id: ProviderId): ProviderAdapter | undefined;
	getAll(): ProviderAdapter[];
}

/**
 * All built-in adapters, keyed by their ID.
 */
const builtInAdapters: ProviderAdapter[] = [
	claudeCodeAdapter,
	codexAdapter,
	cursorAdapter,
	opencodeAdapter,
];

const adapterMap = new Map<ProviderId, ProviderAdapter>(
	builtInAdapters.map((adapter) => [adapter.id, adapter]),
);

/**
 * Get an adapter by its ID.
 */
export function getAdapter(id: ProviderId): ProviderAdapter | undefined {
	return adapterMap.get(id);
}

/**
 * Get all available adapters.
 */
export function getAllAdapters(): ProviderAdapter[] {
	return builtInAdapters;
}

/**
 * Get adapters that are currently enabled in the user's local state.
 */
export async function getEnabledAdapters(): Promise<ProviderAdapter[]> {
	const enabledIds = await readEnabledProviders();
	return enabledIds.map((id) => adapterMap.get(id)).filter((a): a is ProviderAdapter => a != null);
}
