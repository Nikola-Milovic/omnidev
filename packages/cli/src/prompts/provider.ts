import { checkbox } from "@inquirer/prompts";
import type { ProviderId } from "@omnidev-ai/core";

export async function promptForProviders(): Promise<ProviderId[]> {
	const answers = await checkbox({
		message: "Select your AI provider(s):",
		choices: [
			{ name: "Claude Code (Claude CLI)", value: "claude-code", checked: true },
			{ name: "Cursor", value: "cursor", checked: false },
			{ name: "Codex", value: "codex", checked: false },
			{ name: "OpenCode", value: "opencode", checked: false },
		],
		required: true,
	});

	return answers as ProviderId[];
}
