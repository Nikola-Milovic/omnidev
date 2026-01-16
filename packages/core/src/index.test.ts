import { describe, expect, test } from "bun:test";
import { getVersion, version } from "./index";

describe("@omnidev-ai/core", () => {
	describe("version", () => {
		test("should be defined as a string", () => {
			expect(typeof version).toBe("string");
		});

		test("should follow semantic versioning format", () => {
			expect(version).toMatch(/^\d+\.\d+\.\d+$/);
		});
	});

	describe("getVersion", () => {
		test("should return the version string", () => {
			const result = getVersion();
			expect(result).toBe(version);
		});

		test("should return a non-empty string", () => {
			const result = getVersion();
			expect(result.length).toBeGreaterThan(0);
		});
	});
});
