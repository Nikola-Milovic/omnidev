import { buildCommand } from '@stricli/core';
import { existsSync, mkdirSync, appendFileSync } from 'node:fs';

export async function runInit() {
	console.log('Initializing OmniDev...');

	// Create omni/ directory
	mkdirSync('omni', { recursive: true });
	mkdirSync('omni/capabilities', { recursive: true });

	// Create config.toml
	if (!existsSync('omni/config.toml')) {
		await Bun.write('omni/config.toml', defaultConfig());
	}

	// Create .omni/ directory
	mkdirSync('.omni', { recursive: true });
	mkdirSync('.omni/generated', { recursive: true });
	mkdirSync('.omni/state', { recursive: true });
	mkdirSync('.omni/sandbox', { recursive: true });

	// Create reference files
	await createReferenceFiles();

	// Update .gitignore
	await updateGitignore();

	console.log('✓ OmniDev initialized!');
	console.log('');
	console.log('Next steps:');
	console.log('  1. Edit omni/config.toml to configure capabilities');
	console.log('  2. Run: omnidev capability list');
	console.log('  3. Run: omnidev agents sync');
}

export const initCommand = buildCommand({
	parameters: {},
	docs: {
		brief: 'Initialize OmniDev in the current project',
	},
	func: runInit,
});

function defaultConfig(): string {
	return `# OmniDev Configuration
project = "my-project"
default_profile = "default"

[capabilities]
enable = ["tasks"]
disable = []

[profiles.default]
# Default profile uses base capabilities

[profiles.planning]
enable = ["tasks"]
disable = []

[profiles.coding]
enable = ["tasks"]
disable = []
`;
}

async function createReferenceFiles() {
	// agents.md
	if (!existsSync('agents.md')) {
		await Bun.write(
			'agents.md',
			`# Agent Configuration

> Managed by OmniDev. Do not edit directly.
> Run \`omnidev agents sync\` to regenerate.

See: .omni/generated/rules.md for current rules.
`,
		);
	}

	// .claude/claude.md
	mkdirSync('.claude', { recursive: true });
	if (!existsSync('.claude/claude.md')) {
		await Bun.write(
			'.claude/claude.md',
			`# Claude Code Configuration

> Managed by OmniDev.
> Skills are in \`.claude/skills/\` (gitignored, profile-dependent)
> Run \`omnidev agents sync\` to regenerate.

See: .omni/generated/rules.md for current rules.
`,
		);
	}
}

async function updateGitignore() {
	const gitignorePath = '.gitignore';
	const omnidevEntries = `
# OmniDev - local state and generated content
.omni/

# Provider-specific generated content (profile-dependent)
.claude/skills/
.cursor/rules/omnidev-*.mdc
`;

	if (existsSync(gitignorePath)) {
		const content = await Bun.file(gitignorePath).text();
		if (!content.includes('.omni/')) {
			appendFileSync(gitignorePath, omnidevEntries);
		}
	} else {
		await Bun.write(gitignorePath, omnidevEntries.trim());
	}
}
