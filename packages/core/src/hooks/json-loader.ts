/**
 * JSON Hooks Loader
 *
 * Parses Claude's hooks.json format and converts it to OmniDev's HooksConfig type.
 * Used when wrapping Claude plugins that use the hooks.json format.
 */

import { existsSync, readFileSync } from "node:fs";
import { HOOK_EVENTS } from "./constants.js";
import type { HooksConfig, Hook, HookMatcher, HookEvent, HookValidationResult } from "./types.js";
import { isHookEvent, isHookType } from "./types.js";
import { createEmptyHooksConfig, createEmptyValidationResult } from "./validation.js";

/**
 * Claude hooks.json format types
 */
interface ClaudeHookEntry {
	type?: string;
	command?: string;
	prompt?: string;
	timeout?: number;
}

interface ClaudeMatcherEntry {
	matcher?: string;
	hooks?: ClaudeHookEntry[];
}

type ClaudeHooksJson = {
	[eventName: string]: ClaudeMatcherEntry[];
};

/**
 * Known fields in Claude's hooks.json format
 */
const KNOWN_HOOK_FIELDS = new Set(["type", "command", "prompt", "timeout"]);
const KNOWN_MATCHER_FIELDS = new Set(["matcher", "hooks"]);

/**
 * Result of loading a hooks.json file
 */
export interface LoadJsonHooksResult {
	/** The loaded hooks configuration */
	config: HooksConfig;
	/** Validation result */
	validation: HookValidationResult;
	/** Whether the file was found */
	found: boolean;
	/** Path to the hooks config file */
	configPath: string;
	/** Any errors during loading */
	loadError?: string;
	/** Warnings about unknown fields */
	unknownFieldWarnings: string[];
}

/**
 * Load and parse a hooks.json file
 *
 * @param configPath - Path to the hooks.json file
 * @returns LoadJsonHooksResult with parsed config and any warnings
 */
export function loadHooksJson(configPath: string): LoadJsonHooksResult {
	const unknownFieldWarnings: string[] = [];

	// Check if file exists
	if (!existsSync(configPath)) {
		return {
			config: createEmptyHooksConfig(),
			validation: createEmptyValidationResult(),
			found: false,
			configPath,
			unknownFieldWarnings: [],
		};
	}

	// Read file
	let rawContent: string;
	try {
		rawContent = readFileSync(configPath, "utf-8");
	} catch (error) {
		return {
			config: createEmptyHooksConfig(),
			validation: {
				valid: false,
				errors: [
					{
						severity: "error",
						code: "HOOKS_INVALID_TOML", // Reusing code, could add HOOKS_INVALID_JSON
						message: `Failed to read hooks.json: ${error instanceof Error ? error.message : String(error)}`,
						path: configPath,
					},
				],
				warnings: [],
			},
			found: true,
			configPath,
			loadError: `Failed to read: ${error instanceof Error ? error.message : String(error)}`,
			unknownFieldWarnings: [],
		};
	}

	// Parse JSON
	let parsed: unknown;
	try {
		parsed = JSON.parse(rawContent);
	} catch (error) {
		return {
			config: createEmptyHooksConfig(),
			validation: {
				valid: false,
				errors: [
					{
						severity: "error",
						code: "HOOKS_INVALID_TOML",
						message: `Invalid JSON syntax: ${error instanceof Error ? error.message : String(error)}`,
						path: configPath,
					},
				],
				warnings: [],
			},
			found: true,
			configPath,
			loadError: `Invalid JSON: ${error instanceof Error ? error.message : String(error)}`,
			unknownFieldWarnings: [],
		};
	}

	// Convert to HooksConfig
	const result = convertClaudeHooksToConfig(parsed as ClaudeHooksJson, unknownFieldWarnings);

	return {
		config: result.config,
		validation: result.validation,
		found: true,
		configPath,
		unknownFieldWarnings,
	};
}

/**
 * Convert Claude hooks.json format to OmniDev HooksConfig
 */
function convertClaudeHooksToConfig(
	claudeHooks: ClaudeHooksJson,
	unknownFieldWarnings: string[],
): { config: HooksConfig; validation: HookValidationResult } {
	const config: HooksConfig = {};
	const errors: HookValidationResult["errors"] = [];
	const warnings: HookValidationResult["warnings"] = [];

	if (typeof claudeHooks !== "object" || claudeHooks === null || Array.isArray(claudeHooks)) {
		errors.push({
			severity: "error",
			code: "HOOKS_INVALID_TOML",
			message: "hooks.json must be an object",
		});
		return { config: createEmptyHooksConfig(), validation: { valid: false, errors, warnings } };
	}

	// Process each event
	for (const [eventName, matchers] of Object.entries(claudeHooks)) {
		// Check if it's a valid event
		if (!isHookEvent(eventName)) {
			unknownFieldWarnings.push(
				`Unknown event "${eventName}" in hooks.json. Valid events: ${HOOK_EVENTS.join(", ")}`,
			);
			continue;
		}

		const event = eventName as HookEvent;

		// Matchers must be an array
		if (!Array.isArray(matchers)) {
			errors.push({
				severity: "error",
				code: "HOOKS_INVALID_TOML",
				event,
				message: `${event} must be an array of matchers`,
			});
			continue;
		}

		// Convert each matcher
		const convertedMatchers: HookMatcher[] = [];
		for (let i = 0; i < matchers.length; i++) {
			const matcher = matchers[i];
			if (!matcher) continue;

			// Check for unknown fields in matcher
			if (typeof matcher === "object" && matcher !== null) {
				for (const key of Object.keys(matcher)) {
					if (!KNOWN_MATCHER_FIELDS.has(key)) {
						unknownFieldWarnings.push(
							`Unknown field "${key}" in ${event}[${i}]. Known fields: ${[...KNOWN_MATCHER_FIELDS].join(", ")}`,
						);
					}
				}
			}

			const convertedMatcher = convertMatcher(matcher, event, i, errors, unknownFieldWarnings);
			if (convertedMatcher) {
				convertedMatchers.push(convertedMatcher);
			}
		}

		if (convertedMatchers.length > 0) {
			config[event] = convertedMatchers;
		}
	}

	return {
		config,
		validation: {
			valid: errors.length === 0,
			errors,
			warnings,
		},
	};
}

/**
 * Convert a single matcher entry
 */
function convertMatcher(
	matcher: ClaudeMatcherEntry,
	event: HookEvent,
	matcherIndex: number,
	errors: HookValidationResult["errors"],
	unknownFieldWarnings: string[],
): HookMatcher | null {
	if (typeof matcher !== "object" || matcher === null || Array.isArray(matcher)) {
		errors.push({
			severity: "error",
			code: "HOOKS_INVALID_TOML",
			event,
			matcherIndex,
			message: `Matcher at index ${matcherIndex} must be an object`,
		});
		return null;
	}

	const hooks: Hook[] = [];
	const hooksArray = matcher.hooks;

	if (!hooksArray) {
		errors.push({
			severity: "error",
			code: "HOOKS_INVALID_HOOKS_ARRAY",
			event,
			matcherIndex,
			message: "Matcher must have a 'hooks' array",
		});
		return null;
	}

	if (!Array.isArray(hooksArray)) {
		errors.push({
			severity: "error",
			code: "HOOKS_INVALID_HOOKS_ARRAY",
			event,
			matcherIndex,
			message: "'hooks' must be an array",
		});
		return null;
	}

	// Convert each hook
	for (let i = 0; i < hooksArray.length; i++) {
		const hookEntry = hooksArray[i];
		if (!hookEntry) continue;

		// Check for unknown fields in hook
		if (typeof hookEntry === "object" && hookEntry !== null) {
			for (const key of Object.keys(hookEntry)) {
				if (!KNOWN_HOOK_FIELDS.has(key)) {
					unknownFieldWarnings.push(
						`Unknown field "${key}" in ${event}[${matcherIndex}].hooks[${i}]. Known fields: ${[...KNOWN_HOOK_FIELDS].join(", ")}`,
					);
				}
			}
		}

		const hook = convertHook(hookEntry, event, matcherIndex, i, errors);
		if (hook) {
			hooks.push(hook);
		}
	}

	if (hooks.length === 0) {
		return null;
	}

	const result: HookMatcher = { hooks };
	if (matcher.matcher !== undefined) {
		result.matcher = matcher.matcher;
	}

	return result;
}

/**
 * Convert a single hook entry
 */
function convertHook(
	hookEntry: ClaudeHookEntry,
	event: HookEvent,
	matcherIndex: number,
	hookIndex: number,
	errors: HookValidationResult["errors"],
): Hook | null {
	if (typeof hookEntry !== "object" || hookEntry === null || Array.isArray(hookEntry)) {
		errors.push({
			severity: "error",
			code: "HOOKS_INVALID_TOML",
			event,
			matcherIndex,
			hookIndex,
			message: "Hook must be an object",
		});
		return null;
	}

	const hookType = hookEntry.type;

	// Check type field
	if (!hookType) {
		errors.push({
			severity: "error",
			code: "HOOKS_INVALID_TYPE",
			event,
			matcherIndex,
			hookIndex,
			message: "Hook must have a 'type' field",
		});
		return null;
	}

	if (!isHookType(hookType)) {
		errors.push({
			severity: "error",
			code: "HOOKS_INVALID_TYPE",
			event,
			matcherIndex,
			hookIndex,
			message: `Invalid hook type: "${hookType}". Must be "command" or "prompt"`,
		});
		return null;
	}

	// Build hook object
	if (hookType === "command") {
		if (typeof hookEntry.command !== "string") {
			errors.push({
				severity: "error",
				code: "HOOKS_MISSING_COMMAND",
				event,
				matcherIndex,
				hookIndex,
				message: "Command hook must have a 'command' string field",
			});
			return null;
		}

		const hook: Hook = {
			type: "command",
			command: hookEntry.command,
		};

		if (typeof hookEntry.timeout === "number") {
			hook.timeout = hookEntry.timeout;
		}

		return hook;
	}

	if (hookType === "prompt") {
		if (typeof hookEntry.prompt !== "string") {
			errors.push({
				severity: "error",
				code: "HOOKS_MISSING_PROMPT",
				event,
				matcherIndex,
				hookIndex,
				message: "Prompt hook must have a 'prompt' string field",
			});
			return null;
		}

		const hook: Hook = {
			type: "prompt",
			prompt: hookEntry.prompt,
		};

		if (typeof hookEntry.timeout === "number") {
			hook.timeout = hookEntry.timeout;
		}

		return hook;
	}

	return null;
}
