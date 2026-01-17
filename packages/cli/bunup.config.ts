import { defineConfig } from "bunup";

export default defineConfig({
	entry: ["src/index.ts"],
	format: ["esm"],
	target: "node",
	clean: true,
	external: [
		"@omnidev-ai/core",
		"@inquirer/prompts",
		"@stricli/core",
		// Node built-ins
		/^node:/,
	],
	noExternal: ["@omnidev-ai/adapters"],
	// Add node shebang to the CLI entry
	banner: "#!/usr/bin/env node",
});
