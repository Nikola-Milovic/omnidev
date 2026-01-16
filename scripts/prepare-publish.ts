#!/usr/bin/env bun
/**
 * Pre-publish script that replaces workspace:* dependencies with actual versions.
 * This is needed because npm doesn't understand the workspace: protocol.
 *
 * Run this before `changeset publish` or use it in prepack scripts.
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const packagesDir = join(import.meta.dirname, "../packages");

interface PackageJson {
	name: string;
	version: string;
	dependencies?: Record<string, string>;
	devDependencies?: Record<string, string>;
	peerDependencies?: Record<string, string>;
}

// Get all package versions from the monorepo
function getWorkspaceVersions(): Map<string, string> {
	const versions = new Map<string, string>();
	const packages = ["cli", "core", "mcp"];

	for (const pkg of packages) {
		const pkgJsonPath = join(packagesDir, pkg, "package.json");
		if (existsSync(pkgJsonPath)) {
			const pkgJson: PackageJson = JSON.parse(readFileSync(pkgJsonPath, "utf-8"));
			versions.set(pkgJson.name, pkgJson.version);
		}
	}

	return versions;
}

// Replace workspace:* with actual versions
function replaceWorkspaceProtocol(
	deps: Record<string, string> | undefined,
	versions: Map<string, string>,
): boolean {
	if (!deps) return false;

	let modified = false;
	for (const [name, version] of Object.entries(deps)) {
		if (version.startsWith("workspace:")) {
			const actualVersion = versions.get(name);
			if (actualVersion) {
				deps[name] = `^${actualVersion}`;
				modified = true;
				console.log(`  ${name}: workspace:* -> ^${actualVersion}`);
			} else {
				console.error(`  Warning: Could not find version for ${name}`);
			}
		}
	}
	return modified;
}

function main() {
	const versions = getWorkspaceVersions();
	console.log("Workspace versions:", Object.fromEntries(versions));
	console.log("");

	const packages = ["cli", "core", "mcp"];

	for (const pkg of packages) {
		const pkgJsonPath = join(packagesDir, pkg, "package.json");
		if (!existsSync(pkgJsonPath)) continue;

		const pkgJson: PackageJson = JSON.parse(readFileSync(pkgJsonPath, "utf-8"));
		console.log(`Processing ${pkgJson.name}...`);

		let modified = false;
		modified = replaceWorkspaceProtocol(pkgJson.dependencies, versions) || modified;
		modified = replaceWorkspaceProtocol(pkgJson.devDependencies, versions) || modified;
		modified = replaceWorkspaceProtocol(pkgJson.peerDependencies, versions) || modified;

		if (modified) {
			writeFileSync(pkgJsonPath, `${JSON.stringify(pkgJson, null, "\t")}\n`);
			console.log(`  Updated ${pkgJsonPath}`);
		} else {
			console.log("  No workspace: dependencies found");
		}
		console.log("");
	}

	console.log("Done! Ready to publish.");
}

main();
