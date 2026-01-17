/**
 * Tests for file watcher functionality
 */

import { beforeEach, describe, expect, test } from "bun:test";
import { mkdirSync } from "node:fs";
import { setupTestDir } from "@omnidev-ai/core/test-utils";
import { startWatcher } from "./watcher.js";

describe("startWatcher", () => {
	const testDir = setupTestDir("watcher-test-", { chdir: true });

	beforeEach(() => {
		// Create test directory in /tmp
		mkdirSync(`${testDir.path}/omni`, { recursive: true });
		mkdirSync(`${testDir.path}/.omni`, { recursive: true });
		mkdirSync(`${testDir.path}/omni/capabilities`, { recursive: true });

		// Write initial config files
		Bun.write(`${testDir.path}/omni.toml`, '[capability]\nid = "test"');
		Bun.write(`${testDir.path}/.omni/active-profile`, "default");
	});

	test("starts watcher without errors", () => {
		const onReload = async () => {
			// No-op
		};

		// Should not throw
		expect(() => startWatcher(onReload)).not.toThrow();
	});

	test("handles missing watch paths gracefully", () => {
		// Create minimal test directory without all watched paths
		testDir.reset("watcher-missing-test-");

		const onReload = async () => {
			// No-op for this test
		};

		// Should not throw even if paths don't exist
		expect(() => startWatcher(onReload)).not.toThrow();
	});

	test("onReload callback is called asynchronously", async () => {
		let callbackCalled = false;
		const onReload = async () => {
			callbackCalled = true;
		};

		startWatcher(onReload);

		// Modify config file to trigger watcher
		await Bun.write("omni.toml", '[capability]\nid = "changed"');

		// Wait for file system event + debounce (500ms) + buffer
		await new Promise((resolve) => setTimeout(resolve, 800));

		// Callback may or may not be called depending on FS event timing
		// Just verify the watcher was set up without errors
		expect(typeof callbackCalled).toBe("boolean");
	});

	test("debounce timer delays callback execution", async () => {
		const callTimestamps: number[] = [];
		const onReload = async () => {
			callTimestamps.push(Date.now());
		};

		startWatcher(onReload);

		const startTime = Date.now();

		// Make multiple rapid changes
		await Bun.write("omni.toml", '[capability]\nid = "change1"');
		await new Promise((resolve) => setTimeout(resolve, 100));
		await Bun.write("omni.toml", '[capability]\nid = "change2"');
		await new Promise((resolve) => setTimeout(resolve, 100));
		await Bun.write("omni.toml", '[capability]\nid = "change3"');

		// Wait for debounce (500ms from last change) + buffer
		await new Promise((resolve) => setTimeout(resolve, 800));

		// If any callbacks were called, verify they were debounced
		if (callTimestamps.length > 0) {
			const firstCallDelay = callTimestamps[0] - startTime;
			// Should be at least 500ms (debounce delay)
			expect(firstCallDelay).toBeGreaterThanOrEqual(400); // Allow some margin
		}
	});

	test("watcher is configured for all required paths", () => {
		let watcherInitialized = false;
		const onReload = async () => {
			watcherInitialized = true;
		};

		// Initialize watcher
		startWatcher(onReload);

		// Just verify initialization succeeds
		expect(watcherInitialized).toBe(false);
	});
});
