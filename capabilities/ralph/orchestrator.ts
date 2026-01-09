/**
 * Ralph Orchestrator
 *
 * Handles agent spawning and iteration loops for PRD-driven development.
 */

import { spawn } from "bun";
import { existsSync } from "node:fs";
import { join } from "node:path";
import type { AgentConfig, RalphConfig } from "./types.d.ts";
import { archivePRD, getNextStory, getPRD } from "./state.ts";
import { generatePrompt } from "./prompt.ts";

const RALPH_DIR = ".omni/ralph";
const CONFIG_PATH = join(RALPH_DIR, "config.toml");

/**
 * Loads Ralph configuration from .omni/ralph/config.toml
 */
export async function loadRalphConfig(): Promise<RalphConfig> {
	if (!existsSync(CONFIG_PATH)) {
		throw new Error("Ralph config not found. Run 'omnidev ralph init' first.");
	}

	const content = await Bun.file(CONFIG_PATH).text();

	// Parse TOML manually (simple parser for our needs)
	const lines = content.split("\n");
	const config: Partial<RalphConfig> = {
		agents: {},
	};

	let currentSection: string | null = null;
	let currentAgent: string | null = null;

	for (const line of lines) {
		const trimmed = line.trim();

		// Skip empty lines and comments
		if (trimmed === "" || trimmed.startsWith("#")) {
			continue;
		}

		// Section headers
		if (trimmed.startsWith("[")) {
			const match = trimmed.match(/^\[([^\]]+)\]$/);
			if (match) {
				const section = match[1];
				if (section === "ralph") {
					currentSection = "ralph";
					currentAgent = null;
				} else if (section?.startsWith("agents.")) {
					currentSection = "agents";
					currentAgent = section.slice("agents.".length);
					if (!config.agents) {
						config.agents = {};
					}
					config.agents[currentAgent] = { command: "", args: [] };
				}
			}
			continue;
		}

		// Key-value pairs
		const match = trimmed.match(/^(\w+)\s*=\s*(.+)$/);
		if (match) {
			const [, key, value] = match;
			if (!key || !value) {
				continue;
			}

			if (currentSection === "ralph") {
				if (key === "default_agent") {
					config.default_agent = value.replace(/["']/g, "");
				} else if (key === "default_iterations") {
					config.default_iterations = Number.parseInt(value, 10);
				} else if (key === "auto_archive") {
					config.auto_archive = value === "true";
				}
			} else if (currentSection === "agents" && currentAgent) {
				const agent = config.agents?.[currentAgent];
				if (!agent) {
					continue;
				}

				if (key === "command") {
					agent.command = value.replace(/["']/g, "");
				} else if (key === "args") {
					// Parse array
					const arrayMatch = value.match(/\[(.*)\]/);
					if (arrayMatch?.[1]) {
						agent.args = arrayMatch[1].split(",").map((arg) => arg.trim().replace(/["']/g, ""));
					}
				}
			}
		}
	}

	// Validate required fields
	if (!config.default_agent || !config.default_iterations) {
		throw new Error("Invalid Ralph config: missing required fields");
	}

	return config as RalphConfig;
}

/**
 * Spawns an agent process with the given prompt.
 */
export async function runAgent(
	prompt: string,
	agentConfig: AgentConfig,
): Promise<{ output: string; exitCode: number }> {
	const proc = spawn({
		cmd: [agentConfig.command, ...agentConfig.args],
		stdin: "pipe",
		stdout: "pipe",
		stderr: "pipe",
	});

	// Write prompt to stdin
	proc.stdin.write(prompt);
	proc.stdin.end();

	// Collect output
	const output = await new Response(proc.stdout).text();
	const exitCode = await proc.exited;

	return { output, exitCode };
}

/**
 * Runs the orchestration loop for a PRD.
 */
export async function runOrchestration(
	prdName: string,
	agentName: string,
	maxIterations: number,
): Promise<void> {
	const config = await loadRalphConfig();

	// Validate agent exists
	const agentConfig = config.agents[agentName];
	if (!agentConfig) {
		throw new Error(
			`Agent '${agentName}' not found in config. Available: ${Object.keys(config.agents).join(", ")}`,
		);
	}

	console.log(`Starting orchestration for PRD: ${prdName}`);
	console.log(`Using agent: ${agentName}`);
	console.log(`Max iterations: ${maxIterations}`);

	for (let i = 0; i < maxIterations; i++) {
		console.log(`\n=== Iteration ${i + 1}/${maxIterations} ===`);

		// Get current PRD and next story
		const prd = await getPRD(prdName);
		const story = await getNextStory(prdName);

		if (!story) {
			console.log("✓ All stories complete!");

			if (config.auto_archive) {
				console.log("Auto-archiving PRD...");
				await archivePRD(prdName);
			}

			return;
		}

		console.log(`Working on: ${story.id} - ${story.title}`);

		// Generate prompt
		const prompt = await generatePrompt(prd, story, prdName);

		// Run agent
		console.log("Spawning agent...");
		const { output, exitCode } = await runAgent(prompt, agentConfig);

		// Log output
		console.log("\n--- Agent Output ---");
		console.log(output);
		console.log(`--- Exit Code: ${exitCode} ---\n`);

		// Check for completion signal
		if (output.includes("<promise>COMPLETE</promise>")) {
			console.log("✓ Agent signaled completion!");

			if (config.auto_archive) {
				console.log("Auto-archiving PRD...");
				await archivePRD(prdName);
			}

			return;
		}

		// Check if story was marked as passed
		const updatedPrd = await getPRD(prdName);
		const updatedStory = updatedPrd.userStories.find((s) => s.id === story.id);
		if (updatedStory?.passes) {
			console.log(`✓ Story ${story.id} marked as passed`);
		} else {
			console.log(`! Story ${story.id} not yet passed`);
		}
	}

	console.log(`\nReached max iterations (${maxIterations})`);
	console.log("Run 'omnidev ralph start' again to continue.");
}
