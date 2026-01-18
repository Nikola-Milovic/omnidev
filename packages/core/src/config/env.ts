import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import type { EnvDeclaration } from "../types";

const ENV_FILE = ".omni/.env";

/**
 * Load environment variables from .omni/.env file and merge with process.env.
 * Process environment variables take precedence over file values.
 *
 * @returns Merged environment variables
 */
export async function loadEnvironment(): Promise<Record<string, string>> {
	const env: Record<string, string> = {};

	// Load from .omni/.env
	if (existsSync(ENV_FILE)) {
		const content = await readFile(ENV_FILE, "utf-8");
		for (const line of content.split("\n")) {
			const trimmed = line.trim();
			// Skip empty lines and comments
			if (trimmed && !trimmed.startsWith("#")) {
				const eqIndex = trimmed.indexOf("=");
				if (eqIndex > 0) {
					const key = trimmed.slice(0, eqIndex).trim();
					const value = trimmed.slice(eqIndex + 1).trim();
					// Remove quotes if present
					const unquotedValue =
						(value.startsWith('"') && value.endsWith('"')) ||
						(value.startsWith("'") && value.endsWith("'"))
							? value.slice(1, -1)
							: value;
					env[key] = unquotedValue;
				}
			}
		}
	}

	// Process env takes precedence - filter out undefined values
	const processEnv: Record<string, string> = {};
	for (const [key, value] of Object.entries(process.env)) {
		if (value !== undefined) {
			processEnv[key] = value;
		}
	}

	return { ...env, ...processEnv };
}

/**
 * Validate that all required environment variables are present.
 * Checks declarations from capability config and throws descriptive errors for missing vars.
 *
 * @param declarations - Environment variable declarations from capability.toml
 * @param env - Loaded environment variables
 * @param capabilityId - ID of the capability being validated
 * @throws Error if required environment variables are missing
 */
export function validateEnv(
	declarations: Record<string, EnvDeclaration | Record<string, never>>,
	env: Record<string, string | undefined>,
	capabilityId: string,
): void {
	const missing: string[] = [];

	for (const [key, decl] of Object.entries(declarations)) {
		const declaration = decl as EnvDeclaration;
		const value = env[key] ?? declaration.default;

		if (declaration.required && !value) {
			missing.push(key);
		}
	}

	if (missing.length > 0) {
		throw new Error(
			`Missing required environment variable${missing.length > 1 ? "s" : ""} for capability "${capabilityId}": ${missing.join(", ")}. ` +
				`Set ${missing.length > 1 ? "them" : "it"} in .omni/.env or as environment variable${missing.length > 1 ? "s" : ""}.`,
		);
	}
}

/**
 * Check if an environment variable should be treated as a secret.
 * Secrets should be masked in logs and error messages.
 *
 * @param key - Environment variable name
 * @param declarations - Environment variable declarations from capability.toml
 * @returns true if the variable is marked as secret
 */
export function isSecretEnvVar(
	key: string,
	declarations: Record<string, EnvDeclaration | Record<string, never>>,
): boolean {
	const decl = declarations[key] as EnvDeclaration | undefined;
	return decl?.secret === true;
}
