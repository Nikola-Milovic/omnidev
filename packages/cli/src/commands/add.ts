import { existsSync } from "node:fs";
import { getEnabledAdapters } from "@omnidev-ai/adapters";
import {
	getActiveProfile,
	loadBaseConfig,
	syncAgentConfiguration,
	writeConfig,
	type McpConfig,
	type McpTransport,
	type OmniConfig,
} from "@omnidev-ai/core";
import { buildCommand, buildRouteMap } from "@stricli/core";

/**
 * Add a capability to the active profile's capabilities list
 */
function addToActiveProfile(config: OmniConfig, activeProfile: string, capabilityName: string) {
	// Ensure profiles object exists
	if (!config.profiles) {
		config.profiles = {};
	}

	// Ensure profile exists
	if (!config.profiles[activeProfile]) {
		config.profiles[activeProfile] = { capabilities: [] };
	}

	// Ensure capabilities array exists
	if (!config.profiles[activeProfile].capabilities) {
		config.profiles[activeProfile].capabilities = [];
	}

	// Add capability if not already present
	if (!config.profiles[activeProfile].capabilities.includes(capabilityName)) {
		config.profiles[activeProfile].capabilities.push(capabilityName);
	}
}

interface AddCapFlags {
	github: string;
	path?: string | undefined;
}

/**
 * Run the add cap command
 */
export async function runAddCap(flags: AddCapFlags, name: string): Promise<void> {
	try {
		// Check if omni.toml exists
		if (!existsSync("omni.toml")) {
			console.log("✗ No config file found");
			console.log("  Run: omnidev init");
			process.exit(1);
		}

		// Validate github format
		if (!flags.github.includes("/")) {
			console.error("✗ Invalid GitHub repository format");
			console.log("  Expected format: user/repo");
			console.log("  Example: omnidev add cap my-cap --github expo/skills");
			process.exit(1);
		}

		// Load config
		const config = await loadBaseConfig();
		const activeProfile = (await getActiveProfile()) ?? config.active_profile ?? "default";

		// Ensure capabilities.sources exists
		if (!config.capabilities) {
			config.capabilities = {};
		}
		if (!config.capabilities.sources) {
			config.capabilities.sources = {};
		}

		// Check if source already exists
		if (config.capabilities.sources[name]) {
			console.error(`✗ Capability source "${name}" already exists`);
			console.log("  Use a different name or remove the existing source first");
			process.exit(1);
		}

		// Create source config
		const source = `github:${flags.github}`;
		if (flags.path) {
			config.capabilities.sources[name] = { source, path: flags.path };
		} else {
			config.capabilities.sources[name] = source;
		}

		// Add to active profile
		addToActiveProfile(config, activeProfile, name);

		// Write config
		await writeConfig(config);

		console.log(`✓ Added capability source: ${name}`);
		console.log(`  Source: ${source}`);
		if (flags.path) {
			console.log(`  Path: ${flags.path}`);
		}
		console.log(`  Enabled in profile: ${activeProfile}`);
		console.log("");

		// Auto-sync
		const adapters = await getEnabledAdapters();
		await syncAgentConfiguration({ adapters });

		console.log("✓ Sync completed");
	} catch (error) {
		console.error("✗ Error adding capability:", error);
		process.exit(1);
	}
}

interface AddMcpFlags {
	transport?: string | undefined;
	url?: string | undefined;
	command?: string | undefined;
	args?: string | undefined;
	header?: string[] | undefined;
	env?: string[] | undefined;
}

/**
 * Run the add mcp command
 */
export async function runAddMcp(flags: AddMcpFlags, name: string): Promise<void> {
	try {
		// Check if omni.toml exists
		if (!existsSync("omni.toml")) {
			console.log("✗ No config file found");
			console.log("  Run: omnidev init");
			process.exit(1);
		}

		// Load config
		const config = await loadBaseConfig();
		const activeProfile = (await getActiveProfile()) ?? config.active_profile ?? "default";

		// Ensure mcps exists
		if (!config.mcps) {
			config.mcps = {};
		}

		// Check if MCP already exists
		if (config.mcps[name]) {
			console.error(`✗ MCP "${name}" already exists`);
			console.log("  Use a different name or remove the existing MCP first");
			process.exit(1);
		}

		const transport = (flags.transport ?? "stdio") as McpTransport;
		const mcpConfig: McpConfig = {};

		if (transport === "http" || transport === "sse") {
			// Remote server - URL is required
			if (!flags.url) {
				console.error("✗ --url is required for http/sse transport");
				console.log(
					"  Example: omnidev add mcp notion --transport http --url https://mcp.notion.com/mcp",
				);
				process.exit(1);
			}

			mcpConfig.transport = transport;
			mcpConfig.url = flags.url;

			// Parse headers
			if (flags.header && flags.header.length > 0) {
				mcpConfig.headers = {};
				for (const header of flags.header) {
					const colonIndex = header.indexOf(":");
					if (colonIndex === -1) {
						console.error(`✗ Invalid header format: ${header}`);
						console.log("  Expected format: Name: Value");
						process.exit(1);
					}
					const headerName = header.slice(0, colonIndex).trim();
					const headerValue = header.slice(colonIndex + 1).trim();
					mcpConfig.headers[headerName] = headerValue;
				}
			}
		} else {
			// stdio transport - command is required
			if (!flags.command) {
				console.error("✗ --command is required for stdio transport");
				console.log(
					"  Example: omnidev add mcp filesystem --command npx --args '-y @modelcontextprotocol/server-filesystem /path'",
				);
				process.exit(1);
			}

			mcpConfig.command = flags.command;
			if (flags.args) {
				// Split args on spaces, respecting quoted strings
				mcpConfig.args = parseArgs(flags.args);
			}

			// Parse env variables
			if (flags.env && flags.env.length > 0) {
				mcpConfig.env = {};
				for (const envVar of flags.env) {
					const eqIndex = envVar.indexOf("=");
					if (eqIndex === -1) {
						console.error(`✗ Invalid env format: ${envVar}`);
						console.log("  Expected format: KEY=value");
						process.exit(1);
					}
					const key = envVar.slice(0, eqIndex);
					const value = envVar.slice(eqIndex + 1);
					mcpConfig.env[key] = value;
				}
			}
		}

		// Add MCP config
		config.mcps[name] = mcpConfig;

		// Add to active profile
		addToActiveProfile(config, activeProfile, name);

		// Write config
		await writeConfig(config);

		console.log(`✓ Added MCP: ${name}`);
		console.log(`  Transport: ${transport}`);
		if (mcpConfig.url) {
			console.log(`  URL: ${mcpConfig.url}`);
		}
		if (mcpConfig.command) {
			console.log(`  Command: ${mcpConfig.command}`);
			if (mcpConfig.args) {
				console.log(`  Args: ${mcpConfig.args.join(" ")}`);
			}
		}
		console.log(`  Enabled in profile: ${activeProfile}`);
		console.log("");

		// Auto-sync
		const adapters = await getEnabledAdapters();
		await syncAgentConfiguration({ adapters });

		console.log("✓ Sync completed");
	} catch (error) {
		console.error("✗ Error adding MCP:", error);
		process.exit(1);
	}
}

/**
 * Parse a string of arguments, respecting quoted strings
 */
function parseArgs(argsString: string): string[] {
	const args: string[] = [];
	let current = "";
	let inQuote = false;
	let quoteChar = "";

	for (let i = 0; i < argsString.length; i++) {
		const char = argsString[i];

		if ((char === '"' || char === "'") && !inQuote) {
			inQuote = true;
			quoteChar = char;
		} else if (char === quoteChar && inQuote) {
			inQuote = false;
			quoteChar = "";
		} else if (char === " " && !inQuote) {
			if (current) {
				args.push(current);
				current = "";
			}
		} else {
			current += char;
		}
	}

	if (current) {
		args.push(current);
	}

	return args;
}

async function runAddCapWrapper(
	flags: { github: string; path: string | undefined },
	name: string,
): Promise<void> {
	await runAddCap({ github: flags.github, path: flags.path }, name);
}

const addCapCommand = buildCommand({
	docs: {
		brief: "Add a capability source from GitHub",
		fullDescription:
			"Add a capability source from a GitHub repository. The capability will be auto-enabled in the active profile.",
	},
	parameters: {
		flags: {
			github: {
				kind: "parsed" as const,
				brief: "GitHub repository in user/repo format",
				parse: String,
			},
			path: {
				kind: "parsed" as const,
				brief: "Subdirectory within the repo containing the capability",
				parse: String,
				optional: true,
			},
		},
		positional: {
			kind: "tuple" as const,
			parameters: [
				{
					brief: "Capability name",
					parse: String,
				},
			],
		},
	},
	func: runAddCapWrapper,
});

async function runAddMcpWrapper(
	flags: {
		transport: string | undefined;
		url: string | undefined;
		command: string | undefined;
		args: string | undefined;
		header: string[] | undefined;
		env: string[] | undefined;
	},
	name: string,
): Promise<void> {
	await runAddMcp(
		{
			transport: flags.transport,
			url: flags.url,
			command: flags.command,
			args: flags.args,
			header: flags.header,
			env: flags.env,
		},
		name,
	);
}

const addMcpCommand = buildCommand({
	docs: {
		brief: "Add an MCP server",
		fullDescription: `Add an MCP server to the configuration. Supports three transport types:

HTTP remote server:
  omnidev add mcp <name> --transport http --url <url> [--header "Header: value"]

SSE remote server (deprecated):
  omnidev add mcp <name> --transport sse --url <url> [--header "Header: value"]

Stdio local process (default):
  omnidev add mcp <name> --command <cmd> [--args "arg1 arg2"] [--env KEY=value]

Examples:
  omnidev add mcp notion --transport http --url https://mcp.notion.com/mcp
  omnidev add mcp secure-api --transport http --url https://api.example.com/mcp --header "Authorization: Bearer token"
  omnidev add mcp filesystem --command npx --args "-y @modelcontextprotocol/server-filesystem /path"
  omnidev add mcp database --command node --args "./servers/db.js" --env DB_URL=postgres://localhost`,
	},
	parameters: {
		flags: {
			transport: {
				kind: "parsed" as const,
				brief: "Transport type: stdio (default), http, or sse",
				parse: String,
				optional: true,
			},
			url: {
				kind: "parsed" as const,
				brief: "URL for http/sse transport",
				parse: String,
				optional: true,
			},
			command: {
				kind: "parsed" as const,
				brief: "Command to run for stdio transport",
				parse: String,
				optional: true,
			},
			args: {
				kind: "parsed" as const,
				brief: "Arguments for the command (space-separated, use quotes for args with spaces)",
				parse: String,
				optional: true,
			},
			header: {
				kind: "parsed" as const,
				brief: "HTTP header in 'Name: Value' format (repeatable)",
				parse: String,
				optional: true,
				variadic: true,
			},
			env: {
				kind: "parsed" as const,
				brief: "Environment variable in KEY=value format (repeatable)",
				parse: String,
				optional: true,
				variadic: true,
			},
		},
		positional: {
			kind: "tuple" as const,
			parameters: [
				{
					brief: "MCP name",
					parse: String,
				},
			],
		},
		aliases: {
			t: "transport",
			u: "url",
			c: "command",
			a: "args",
			e: "env",
		},
	},
	func: runAddMcpWrapper,
});

export const addRoutes = buildRouteMap({
	routes: {
		cap: addCapCommand,
		mcp: addMcpCommand,
	},
	docs: {
		brief: "Add capabilities or MCP servers",
	},
});
