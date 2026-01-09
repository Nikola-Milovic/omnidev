/**
 * Ralph CLI Commands
 *
 * Core commands for Ralph orchestration: init, start, stop, status
 */

import { buildCommand, buildRouteMap } from "@stricli/core";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const RALPH_DIR = ".omni/ralph";
const PRDS_DIR = join(RALPH_DIR, "prds");
const COMPLETED_PRDS_DIR = join(RALPH_DIR, "completed-prds");
const CONFIG_PATH = join(RALPH_DIR, "config.toml");

const DEFAULT_CONFIG = `[ralph]
default_agent = "claude"
default_iterations = 10
auto_archive = true

[agents.claude]
command = "npx"
args = ["-y", "@anthropic-ai/claude-code", "--model", "sonnet", "--dangerously-skip-permissions", "-p"]

[agents.codex]
command = "npx"
args = ["-y", "@openai/codex", "exec", "-c", "shell_environment_policy.inherit=all", "--dangerously-bypass-approvals-and-sandbox", "-"]

[agents.amp]
command = "amp"
args = ["--dangerously-allow-all"]
`;

/**
 * Initialize Ralph directory structure
 */
export async function runRalphInit(): Promise<void> {
	console.log("Initializing Ralph...");

	// Create directory structure
	mkdirSync(RALPH_DIR, { recursive: true });
	mkdirSync(PRDS_DIR, { recursive: true });
	mkdirSync(COMPLETED_PRDS_DIR, { recursive: true });

	// Create default config if not exists
	if (!existsSync(CONFIG_PATH)) {
		writeFileSync(CONFIG_PATH, DEFAULT_CONFIG);
		console.log(`✓ Created default config at ${CONFIG_PATH}`);
	} else {
		console.log(`✓ Config already exists at ${CONFIG_PATH}`);
	}

	console.log("✓ Ralph initialized successfully");
	console.log("\nNext steps:");
	console.log("  1. Create a PRD: omnidev ralph prd create <name>");
	console.log("  2. Start orchestration: omnidev ralph start");
}

/**
 * Start Ralph orchestration
 */
export async function runRalphStart(flags: {
	agent?: string;
	iterations?: number;
	prd?: string;
}): Promise<void> {
	// Import Ralph capability dynamically
	const ralphModule = await import(join(process.cwd(), "capabilities/ralph/index.js"));
	const { loadRalphConfig, getActivePRD, runOrchestration, listPRDs, getPRD } = ralphModule;

	// Load config
	const config = await loadRalphConfig();

	// Determine PRD name
	let prdName = flags.prd;
	if (!prdName) {
		prdName = await getActivePRD();
		if (!prdName) {
			const prds = await listPRDs();
			if (prds.length === 0) {
				console.error("No PRDs found. Create one with: omnidev ralph prd create");
				process.exit(1);
			}
			if (prds.length === 1) {
				prdName = prds[0];
				console.log(`Using only PRD: ${prdName}`);
			} else {
				console.error("Multiple PRDs found. Select one with: omnidev ralph prd select <name>");
				console.error(`Available: ${prds.join(", ")}`);
				process.exit(1);
			}
		}
	}

	if (!prdName) {
		console.error(
			"No PRD specified. Use --prd <name> or select one with: omnidev ralph prd select",
		);
		process.exit(1);
	}

	// Validate PRD exists and has incomplete stories
	const prd = await getPRD(prdName);
	const incompleteStories = prd.userStories.filter((s: { passes: boolean }) => !s.passes);

	if (incompleteStories.length === 0) {
		console.log(`All stories in PRD '${prdName}' are complete!`);
		return;
	}

	// Determine agent
	const agentName = flags.agent ?? config.default_agent;

	// Determine max iterations
	const maxIterations = flags.iterations ?? config.default_iterations;

	// Run orchestration
	await runOrchestration(prdName, agentName, maxIterations);
}

/**
 * Stop Ralph orchestration
 */
export async function runRalphStop(): Promise<void> {
	console.log("Stopping Ralph orchestration...");
	// TODO: Implement process management (US-042 or later)
	console.log("Note: Ralph orchestration runs synchronously in current process.");
	console.log("Use Ctrl+C to stop the current iteration.");
}

/**
 * Show Ralph status
 */
export async function runRalphStatus(flags: { prd?: string }): Promise<void> {
	// Import Ralph capability dynamically
	const ralphModule = await import(join(process.cwd(), "capabilities/ralph/index.js"));
	const { getActivePRD, getPRD, listPRDs } = ralphModule;

	// Determine PRD name
	let prdName = flags.prd;
	if (!prdName) {
		prdName = await getActivePRD();
	}

	if (!prdName) {
		const prds = await listPRDs();
		if (prds.length === 0) {
			console.log("No PRDs found.");
			console.log("Create one with: omnidev ralph prd create <name>");
			return;
		}

		console.log("No active PRD selected.");
		console.log(`Available PRDs: ${prds.join(", ")}`);
		console.log("Select one with: omnidev ralph prd select <name>");
		return;
	}

	// Load PRD
	const prd = await getPRD(prdName);

	// Calculate progress
	const totalStories = prd.userStories.length;
	const completedStories = prd.userStories.filter((s: { passes: boolean }) => s.passes).length;
	const remainingStories = prd.userStories.filter((s: { passes: boolean }) => !s.passes);

	// Display status
	console.log(`\n=== Ralph Status ===`);
	console.log(`Active PRD: ${prdName}`);
	console.log(`Branch: ${prd.branchName}`);
	console.log(`Description: ${prd.description}`);
	console.log(`\nProgress: ${completedStories}/${totalStories} stories complete`);

	if (remainingStories.length > 0) {
		console.log(`\nRemaining stories:`);
		for (const story of remainingStories) {
			console.log(`  ${story.id}: ${story.title}`);
		}
	} else {
		console.log("\n✓ All stories complete!");
	}
}

// Build commands
const initCommand = buildCommand({
	func: runRalphInit,
	parameters: {},
	docs: {
		brief: "Initialize Ralph directory structure",
	},
});

const startCommand = buildCommand({
	func: runRalphStart,
	parameters: {
		flags: {
			agent: {
				kind: "parsed" as const,
				brief: "Agent to use (default: claude)",
				parse: String,
				optional: true,
			},
			iterations: {
				kind: "parsed" as const,
				brief: "Max iterations (default: 10)",
				parse: Number,
				optional: true,
			},
			prd: {
				kind: "parsed" as const,
				brief: "PRD name (default: active PRD)",
				parse: String,
				optional: true,
			},
		},
	},
	docs: {
		brief: "Start Ralph orchestration",
	},
});

const stopCommand = buildCommand({
	func: runRalphStop,
	parameters: {},
	docs: {
		brief: "Stop Ralph orchestration",
	},
});

const statusCommand = buildCommand({
	func: runRalphStatus,
	parameters: {
		flags: {
			prd: {
				kind: "parsed" as const,
				brief: "PRD name (default: active PRD)",
				parse: String,
				optional: true,
			},
		},
	},
	docs: {
		brief: "Show Ralph status",
	},
});

// Export route map
export const ralphRoutes = buildRouteMap({
	routes: {
		init: initCommand,
		start: startCommand,
		stop: stopCommand,
		status: statusCommand,
	},
	docs: {
		brief: "Ralph AI orchestrator commands",
	},
});
