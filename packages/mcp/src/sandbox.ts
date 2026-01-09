import { mkdir, readdir, rm, symlink } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import type { LoadedCapability } from "@omnidev/core";

const SANDBOX_DIR = ".omni/sandbox";
const SANDBOX_NODE_MODULES = ".omni/sandbox/node_modules";

/**
 * Sets up the sandbox environment by creating symlinks to enabled capabilities.
 * This allows the sandbox to import capability modules by name.
 */
export async function setupSandbox(capabilities: LoadedCapability[]): Promise<void> {
	// Create sandbox directory
	await mkdir(SANDBOX_DIR, { recursive: true });
	await mkdir(SANDBOX_NODE_MODULES, { recursive: true });

	// Clean existing symlinks
	if (existsSync(SANDBOX_NODE_MODULES)) {
		const entries = await readdir(SANDBOX_NODE_MODULES);
		for (const entry of entries) {
			const entryPath = join(SANDBOX_NODE_MODULES, entry);
			await rm(entryPath, { recursive: true, force: true }).catch(() => {
				// Ignore errors
			});
		}
	}

	// Create symlinks for each capability
	for (const cap of capabilities) {
		const moduleName = cap.config.exports?.module ?? cap.id;
		const linkPath = join(SANDBOX_NODE_MODULES, moduleName);
		const targetPath = join("../../..", cap.path);

		try {
			await symlink(targetPath, linkPath, "dir");
		} catch (e) {
			if ((e as NodeJS.ErrnoException).code !== "EEXIST") {
				console.error(`Failed to symlink ${moduleName}:`, e);
			}
		}
	}
}
