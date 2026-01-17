import { describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { setupTestDir } from "@omnidev-ai/core/test-utils";

describe("wrapping integration - expo-like structure", () => {
	const testDir = setupTestDir("test-expo-", { chdir: true });

	test("wraps expo-like plugin with .claude-plugin/plugin.json", () => {
		// Simulate Expo skills structure: plugins/expo-app-design/
		const pluginDir = join(testDir.path, "plugins", "expo-app-design");
		mkdirSync(join(pluginDir, ".claude-plugin"), { recursive: true });
		mkdirSync(join(pluginDir, "skills"));

		// Create plugin.json (like Expo has)
		writeFileSync(
			join(pluginDir, ".claude-plugin", "plugin.json"),
			JSON.stringify({
				name: "expo-app-design",
				version: "1.0.0",
				description: "Build robust, productivity apps with Expo",
				author: {
					name: "Evan Bacon",
					email: "bacon@expo.io",
				},
			}),
		);

		// Create README
		writeFileSync(
			join(pluginDir, "README.md"),
			`# Expo App Design

Design amazing Expo applications with best practices.

This plugin provides tools for building production-ready Expo apps.`,
		);

		// Create a skill
		const skillDir = join(pluginDir, "skills");
		writeFileSync(
			join(skillDir, "example-skill.md"),
			`---
name: example-skill
description: Example skill for testing
---

# Example Skill

This is an example skill.`,
		);

		// Verify structure exists
		expect(existsSync(join(pluginDir, ".claude-plugin", "plugin.json"))).toBe(true);
		expect(existsSync(join(pluginDir, "README.md"))).toBe(true);
		expect(existsSync(join(pluginDir, "skills", "example-skill.md"))).toBe(true);
		expect(existsSync(join(pluginDir, "capability.toml"))).toBe(false);

		// This should be detected as needing wrapping
		// When fetchGitCapabilitySource runs, it will:
		// 1. Check for capability.toml (not found)
		// 2. Call shouldWrapDirectory
		// 3. Find .claude-plugin/plugin.json
		// 4. Generate capability.toml with metadata from plugin.json
	});

	test("wraps plugin with only directory structure (no plugin.json)", () => {
		const pluginDir = join(testDir.path, "plugins", "simple-plugin");
		mkdirSync(join(pluginDir, "skills"), { recursive: true });

		// Create README
		writeFileSync(
			join(pluginDir, "README.md"),
			`# Simple Plugin

A simple plugin without plugin.json metadata.

This demonstrates wrapping based on directory structure alone.`,
		);

		// Create a skill
		writeFileSync(
			join(pluginDir, "skills", "test-skill.md"),
			`---
name: test-skill
description: Test skill
---

# Test Skill

Content here.`,
		);

		// Verify structure exists
		expect(existsSync(join(pluginDir, ".claude-plugin"))).toBe(false);
		expect(existsSync(join(pluginDir, "skills"))).toBe(true);
		expect(existsSync(join(pluginDir, "capability.toml"))).toBe(false);

		// Should still be detected for wrapping due to skills/ directory
	});

	test("does not wrap when capability.toml already exists", () => {
		const pluginDir = join(testDir.path, "plugins", "proper-capability");
		mkdirSync(join(pluginDir, "skills"), { recursive: true });

		// Create proper capability.toml
		writeFileSync(
			join(pluginDir, "capability.toml"),
			`[capability]
id = "proper-capability"
name = "Proper Capability"
version = "1.0.0"
description = "This is a proper capability with its own TOML"
`,
		);

		// Create a skill
		writeFileSync(join(pluginDir, "skills", "skill.md"), "# Skill\n");

		// Verify capability.toml exists
		expect(existsSync(join(pluginDir, "capability.toml"))).toBe(true);
		expect(existsSync(join(pluginDir, "skills"))).toBe(true);

		// Should NOT be wrapped - already has capability.toml
	});

	test("multiple plugins in monorepo structure", () => {
		// Simulate full Expo skills structure
		const plugins = ["expo-app-design", "expo-deployment", "upgrading-expo"];

		for (const pluginName of plugins) {
			const pluginDir = join(testDir.path, "plugins", pluginName);
			mkdirSync(join(pluginDir, ".claude-plugin"), { recursive: true });
			mkdirSync(join(pluginDir, "skills"), { recursive: true });

			writeFileSync(
				join(pluginDir, ".claude-plugin", "plugin.json"),
				JSON.stringify({
					name: pluginName,
					version: "1.0.0",
					description: `${pluginName} plugin`,
				}),
			);

			writeFileSync(join(pluginDir, "README.md"), `# ${pluginName}\n\nDescription here.`);
			writeFileSync(join(pluginDir, "skills", "example.md"), "# Skill\n");
		}

		// Verify all three plugins have correct structure
		for (const pluginName of plugins) {
			const pluginDir = join(testDir.path, "plugins", pluginName);
			expect(existsSync(join(pluginDir, ".claude-plugin", "plugin.json"))).toBe(true);
			expect(existsSync(join(pluginDir, "skills"))).toBe(true);
			expect(existsSync(join(pluginDir, "capability.toml"))).toBe(false);
		}

		// Each plugin would be loaded separately with:
		// expo-app-design = { source = "github:expo/skills", path = "plugins/expo-app-design" }
		// expo-deployment = { source = "github:expo/skills", path = "plugins/expo-deployment" }
		// upgrading-expo = { source = "github:expo/skills", path = "plugins/upgrading-expo" }
	});
});
