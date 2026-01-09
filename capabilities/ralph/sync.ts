/**
 * Ralph Sync Hook
 *
 * Called by `omnidev agents sync` to set up Ralph directory structure.
 */

import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const RALPH_DIR = ".omni/ralph";
const PRDS_DIR = join(RALPH_DIR, "prds");
const COMPLETED_PRDS_DIR = join(RALPH_DIR, "completed-prds");
const CONFIG_PATH = join(RALPH_DIR, "config.toml");
const GITIGNORE_PATH = ".gitignore";

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
 * Sync hook called by omnidev agents sync.
 * Creates directory structure, default config, and updates .gitignore.
 */
export async function sync(): Promise<void> {
	console.log("Ralph: Setting up directory structure...");

	// Create directory structure
	mkdirSync(RALPH_DIR, { recursive: true });
	mkdirSync(PRDS_DIR, { recursive: true });
	mkdirSync(COMPLETED_PRDS_DIR, { recursive: true });

	// Create default config if not exists
	if (!existsSync(CONFIG_PATH)) {
		await Bun.write(CONFIG_PATH, DEFAULT_CONFIG);
		console.log(`Ralph: Created default config at ${CONFIG_PATH}`);
	}

	// Update .gitignore
	await updateGitignore();

	console.log("Ralph: Sync complete");
}

/**
 * Updates .gitignore to include .omni/ralph/ if not present.
 */
async function updateGitignore(): Promise<void> {
	const entry = ".omni/ralph/";

	let content = "";
	if (existsSync(GITIGNORE_PATH)) {
		content = await Bun.file(GITIGNORE_PATH).text();
	}

	// Check if entry already exists
	if (content.includes(entry)) {
		return;
	}

	// Add entry with section header
	const newContent = content.endsWith("\n") ? content : `${content}\n`;
	const ralphSection = `
# Ralph AI Orchestrator
${entry}
`;

	await Bun.write(GITIGNORE_PATH, newContent + ralphSection);
	console.log("Ralph: Updated .gitignore");
}
