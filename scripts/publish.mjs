#!/usr/bin/env node
import { execSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const PACKAGES = ["packages/core", "packages/cli"];

function exec(cmd, opts = {}) {
	console.log(`$ ${cmd}`);
	return execSync(cmd, { stdio: "inherit", ...opts });
}

function execQuiet(cmd, opts = {}) {
	return execSync(cmd, { encoding: "utf8", ...opts }).trim();
}

for (const pkgDir of PACKAGES) {
	const pkgJsonPath = join(pkgDir, "package.json");
	const pkg = JSON.parse(readFileSync(pkgJsonPath, "utf8"));

	if (pkg.private) {
		console.log(`⏭️  Skipping private package: ${pkg.name}`);
		continue;
	}

	console.log(`\n📦 Publishing ${pkg.name}...`);

	const tarball = execQuiet("bun pm pack --quiet", { cwd: pkgDir });
	const tarballPath = join(pkgDir, tarball);

	const extractDir = join(pkgDir, "_pack_inspect");
	mkdirSync(extractDir, { recursive: true });
	exec(`tar -xzf ${tarball} -C _pack_inspect`, { cwd: pkgDir });

	const packedPkgPath = join(extractDir, "package", "package.json");
	const packedPkg = JSON.parse(readFileSync(packedPkgPath, "utf8"));

	let needsFix = false;

	// CLI is bundled and should publish with no internal deps.
	if (packedPkg.name === "@omnidev-ai/cli" && packedPkg.dependencies) {
		const before = Object.keys(packedPkg.dependencies);
		delete packedPkg.dependencies["@omnidev-ai/adapters"];
		delete packedPkg.dependencies["@omnidev-ai/core"];
		const after = Object.keys(packedPkg.dependencies);
		if (before.length !== after.length) needsFix = true;
		if (after.length === 0) {
			delete packedPkg.dependencies;
			needsFix = true;
		}
	}
	for (const depsKey of ["dependencies", "peerDependencies", "optionalDependencies"]) {
		const deps = packedPkg[depsKey];
		if (!deps) continue;

		for (const [name, version] of Object.entries(deps)) {
			if (version.includes("workspace:")) {
				console.error(`❌ Found unresolved workspace protocol: ${name}: ${version}`);
				process.exit(1);
			}
			if (version.includes("0.0.0-auto-managed")) {
				console.warn(`⚠️  Found 0.0.0-auto-managed in ${name}, fixing...`);
				deps[name] = version.replace("0.0.0-auto-managed", pkg.version);
				needsFix = true;
			}
		}
	}

	if (needsFix) {
		writeFileSync(packedPkgPath, `${JSON.stringify(packedPkg, null, 2)}\n`);
		exec(`tar -czf ${tarball} -C _pack_inspect package`, { cwd: pkgDir });
	}

	rmSync(extractDir, { recursive: true, force: true });

	exec(`npm publish ${tarball} --access public`, { cwd: pkgDir });

	rmSync(tarballPath);

	console.log(`✅ Published ${pkg.name}@${pkg.version}`);
}
