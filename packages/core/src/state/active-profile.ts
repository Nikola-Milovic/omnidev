import { existsSync, mkdirSync } from "node:fs";
import { readFile, unlink, writeFile } from "node:fs/promises";

const STATE_DIR = ".omni/state";
const ACTIVE_PROFILE_PATH = `${STATE_DIR}/active-profile`;

/**
 * Read the active profile from state file.
 * Returns null if no active profile is set in state.
 */
export async function readActiveProfileState(): Promise<string | null> {
	if (!existsSync(ACTIVE_PROFILE_PATH)) {
		return null;
	}

	try {
		const content = await readFile(ACTIVE_PROFILE_PATH, "utf-8");
		const trimmed = content.trim();
		return trimmed || null;
	} catch {
		return null;
	}
}

/**
 * Write the active profile to state file.
 * @param profileName - The name of the profile to set as active
 */
export async function writeActiveProfileState(profileName: string): Promise<void> {
	mkdirSync(STATE_DIR, { recursive: true });
	await writeFile(ACTIVE_PROFILE_PATH, profileName, "utf-8");
}

/**
 * Clear the active profile state (delete the state file).
 */
export async function clearActiveProfileState(): Promise<void> {
	if (existsSync(ACTIVE_PROFILE_PATH)) {
		await unlink(ACTIVE_PROFILE_PATH);
	}
}
