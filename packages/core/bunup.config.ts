import { defineConfig } from "bunup";

export default defineConfig({
	entry: ["src/index.ts", "src/test-utils/index.ts"],
	format: ["esm"],
	target: "node",
	clean: true,
	// Keep dependencies external - users install them
	external: ["smol-toml", "@stricli/core", /^node:/],
	// Generate declaration files for TypeScript users
	dts: true,
});
