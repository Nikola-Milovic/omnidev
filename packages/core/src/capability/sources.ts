/**
 * Git-sourced capabilities: fetching, wrapping, and version management
 *
 * This module handles:
 * - Cloning/fetching capabilities from Git repositories
 * - Wrapping external repos (discovering skills/agents/commands)
 * - Managing the capabilities.lock.toml file
 * - Version tracking and update detection
 */

import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { cp, mkdir, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { parse as parseToml } from "smol-toml";
import type {
	CapabilitiesLockFile,
	CapabilityLockEntry,
	CapabilitySourceConfig,
	FileCapabilitySourceConfig,
	GitCapabilitySourceConfig,
	OmniConfig,
} from "../types/index.js";

// Local path for .omni directory
const OMNI_LOCAL = ".omni";

// Directory names to scan for content (singular and plural forms)
const SKILL_DIRS = ["skills", "skill"];
const AGENT_DIRS = ["agents", "agent", "subagents", "subagent"];
const COMMAND_DIRS = ["commands", "command"];
const RULE_DIRS = ["rules", "rule"];
const DOC_DIRS = ["docs", "doc", "documentation"];

// File patterns for each content type
const SKILL_FILES = ["SKILL.md", "skill.md", "Skill.md"];
const AGENT_FILES = ["AGENT.md", "agent.md", "Agent.md", "SUBAGENT.md", "subagent.md"];
const COMMAND_FILES = ["COMMAND.md", "command.md", "Command.md"];

export interface FetchResult {
	id: string;
	path: string;
	version: string;
	/** Git commit hash (for git sources) */
	commit?: string;
	/** Content hash (for file sources) */
	contentHash?: string;
	updated: boolean;
	wrapped: boolean;
}

export interface SourceUpdateInfo {
	id: string;
	source: string;
	currentVersion: string;
	latestVersion: string;
	hasUpdate: boolean;
}

/**
 * Check if a source string is a file source
 */
export function isFileSource(source: string): boolean {
	return source.startsWith("file://");
}

/**
 * Check if a source string is a git source
 */
export function isGitSource(source: string): boolean {
	return (
		source.startsWith("github:") ||
		source.startsWith("git@") ||
		source.startsWith("https://") ||
		source.startsWith("http://")
	);
}

/**
 * Type guard to check if a parsed source config is a file source
 */
export function isFileSourceConfig(
	config: GitCapabilitySourceConfig | FileCapabilitySourceConfig,
): config is FileCapabilitySourceConfig {
	return isFileSource(config.source);
}

/**
 * Type guard to check if a parsed source config is a git source
 */
export function isGitSourceConfig(
	config: GitCapabilitySourceConfig | FileCapabilitySourceConfig,
): config is GitCapabilitySourceConfig {
	return !isFileSource(config.source);
}

/**
 * Parse a file:// URL into a filesystem path
 * Supports both relative (file://./path) and absolute (file:///path) URLs
 */
export function parseFilePath(fileUrl: string): string {
	if (!fileUrl.startsWith("file://")) {
		throw new Error(`Invalid file URL: ${fileUrl}`);
	}

	const path = fileUrl.slice(7); // Remove "file://"

	// Handle absolute paths (file:///absolute/path)
	if (path.startsWith("/")) {
		return path;
	}

	// Handle relative paths (file://./relative/path or file://relative/path)
	if (path.startsWith("./") || path.startsWith("../")) {
		return resolve(process.cwd(), path);
	}

	// Treat as relative path
	return resolve(process.cwd(), path);
}

/**
 * Calculate SHA256 hash of directory contents for change detection
 * Hashes all files recursively, ignoring .git directory
 */
async function calculateDirectoryHash(dirPath: string): Promise<string> {
	const hash = createHash("sha256");
	await hashDirectory(dirPath, hash);
	return hash.digest("hex");
}

async function hashDirectory(dirPath: string, hash: ReturnType<typeof createHash>): Promise<void> {
	const entries = await readdir(dirPath, { withFileTypes: true });

	// Sort entries for consistent hashing
	entries.sort((a, b) => a.name.localeCompare(b.name));

	for (const entry of entries) {
		const entryPath = join(dirPath, entry.name);

		// Skip .git directory
		if (entry.name === ".git") {
			continue;
		}

		// Add entry name to hash
		hash.update(entry.name);

		if (entry.isDirectory()) {
			await hashDirectory(entryPath, hash);
		} else if (entry.isFile()) {
			const content = await readFile(entryPath);
			hash.update(content);
		}
	}
}

/**
 * Parse a capability source string or config into normalized form
 * Returns either a GitCapabilitySourceConfig or FileCapabilitySourceConfig
 */
export function parseSourceConfig(
	source: CapabilitySourceConfig,
): GitCapabilitySourceConfig | FileCapabilitySourceConfig {
	if (typeof source === "string") {
		// File source shorthand: "file://./path"
		if (isFileSource(source)) {
			return { source };
		}

		// Git source shorthand formats:
		// - "github:user/repo"
		// - "github:user/repo#ref"
		// - "git@github.com:user/repo.git"
		// - "https://github.com/user/repo.git"

		let sourceUrl = source;
		let ref: string | undefined;

		// Check for ref in github shorthand
		if (source.startsWith("github:") && source.includes("#")) {
			const parts = source.split("#");
			sourceUrl = parts[0] ?? source;
			ref = parts[1];
		}

		const result: GitCapabilitySourceConfig = { source: sourceUrl };
		if (ref) {
			result.ref = ref;
		}
		return result;
	}
	return source;
}

/**
 * Convert source to a git-cloneable URL
 */
export function sourceToGitUrl(source: string): string {
	if (source.startsWith("github:")) {
		const repo = source.replace("github:", "");
		return `https://github.com/${repo}.git`;
	}
	// Already a URL or SSH path
	return source;
}

/**
 * Get the path where a capability source will be stored
 */
export function getSourceCapabilityPath(id: string): string {
	return join(OMNI_LOCAL, "capabilities", id);
}

/**
 * Get the lock file path
 */
export function getLockFilePath(): string {
	return "omni.lock.toml";
}

/**
 * Load the capabilities lock file
 */
export async function loadLockFile(): Promise<CapabilitiesLockFile> {
	const lockPath = getLockFilePath();
	if (!existsSync(lockPath)) {
		return { capabilities: {} };
	}

	try {
		const content = await readFile(lockPath, "utf-8");
		const parsed = parseToml(content) as Record<string, unknown>;
		const capabilities = parsed["capabilities"] as Record<string, CapabilityLockEntry> | undefined;
		return {
			capabilities: capabilities || {},
		};
	} catch {
		return { capabilities: {} };
	}
}

/**
 * Stringify a lock file to TOML format
 */
function stringifyLockFile(lockFile: CapabilitiesLockFile): string {
	const lines: string[] = [];

	for (const [id, entry] of Object.entries(lockFile.capabilities)) {
		lines.push(`[capabilities.${id}]`);
		lines.push(`source = "${entry.source}"`);
		lines.push(`version = "${entry.version}"`);
		if (entry.commit) {
			lines.push(`commit = "${entry.commit}"`);
		}
		if (entry.content_hash) {
			lines.push(`content_hash = "${entry.content_hash}"`);
		}
		if (entry.ref) {
			lines.push(`ref = "${entry.ref}"`);
		}
		lines.push(`updated_at = "${entry.updated_at}"`);
		lines.push("");
	}

	return lines.join("\n");
}

/**
 * Save the capabilities lock file
 */
export async function saveLockFile(lockFile: CapabilitiesLockFile): Promise<void> {
	const lockPath = getLockFilePath();

	// Ensure directory exists
	await mkdir(join(OMNI_LOCAL, "capabilities"), { recursive: true });

	const header = `# Auto-generated by OmniDev - DO NOT EDIT
# Records installed capability versions for reproducibility
# Last updated: ${new Date().toISOString()}

`;
	const content = header + stringifyLockFile(lockFile);
	await writeFile(lockPath, content, "utf-8");
}

/**
 * Get the current commit hash of a git repository
 */
async function getRepoCommit(repoPath: string): Promise<string> {
	const proc = Bun.spawn(["git", "rev-parse", "HEAD"], {
		cwd: repoPath,
		stdout: "pipe",
		stderr: "pipe",
	});
	const output = await new Response(proc.stdout).text();
	await proc.exited;
	return output.trim();
}

/**
 * Get short commit hash (7 chars)
 */
function shortCommit(commit: string): string {
	return commit.substring(0, 7);
}

/**
 * Clone a git repository
 */
async function cloneRepo(gitUrl: string, targetPath: string, ref?: string): Promise<void> {
	// Ensure parent directory exists
	await mkdir(join(targetPath, ".."), { recursive: true });

	const args = ["clone", "--depth", "1"];
	if (ref) {
		args.push("--branch", ref);
	}
	args.push(gitUrl, targetPath);

	const proc = Bun.spawn(["git", ...args], {
		stdout: "pipe",
		stderr: "pipe",
	});

	await proc.exited;

	if (proc.exitCode !== 0) {
		const stderr = await new Response(proc.stderr).text();
		throw new Error(`Failed to clone ${gitUrl}: ${stderr}`);
	}
}

/**
 * Fetch and update an existing repository
 */
async function fetchRepo(repoPath: string, ref?: string): Promise<boolean> {
	// Fetch latest
	const fetchProc = Bun.spawn(["git", "fetch", "--depth", "1", "origin"], {
		cwd: repoPath,
		stdout: "pipe",
		stderr: "pipe",
	});
	await fetchProc.exited;

	// Get current and remote commits
	const currentCommit = await getRepoCommit(repoPath);

	// Check remote commit
	const targetRef = ref || "HEAD";
	const lsProc = Bun.spawn(["git", "ls-remote", "origin", targetRef], {
		cwd: repoPath,
		stdout: "pipe",
		stderr: "pipe",
	});
	const lsOutput = await new Response(lsProc.stdout).text();
	await lsProc.exited;

	const remoteCommit = lsOutput.split("\t")[0];

	if (currentCommit === remoteCommit) {
		return false; // No update
	}

	// Pull changes
	const pullProc = Bun.spawn(["git", "pull", "--ff-only"], {
		cwd: repoPath,
		stdout: "pipe",
		stderr: "pipe",
	});
	await pullProc.exited;

	return true; // Updated
}

/**
 * Check if a directory contains a capability.toml
 */
function hasCapabilityToml(dirPath: string): boolean {
	return existsSync(join(dirPath, "capability.toml"));
}

/**
 * Check if a directory should be wrapped (has plugin.json or appropriate structure)
 * Returns true if:
 * 1. .claude-plugin/plugin.json exists, OR
 * 2. Any of the expected content directories exist (skills, agents, commands, rules, docs)
 */
async function shouldWrapDirectory(dirPath: string): Promise<boolean> {
	// Check for plugin.json
	if (existsSync(join(dirPath, ".claude-plugin", "plugin.json"))) {
		return true;
	}

	// Check for any expected content directories
	const allDirs = [...SKILL_DIRS, ...AGENT_DIRS, ...COMMAND_DIRS, ...RULE_DIRS, ...DOC_DIRS];
	for (const dirName of allDirs) {
		const checkPath = join(dirPath, dirName);
		if (existsSync(checkPath)) {
			const stats = await stat(checkPath);
			if (stats.isDirectory()) {
				return true;
			}
		}
	}

	return false;
}

/**
 * Find directories matching any of the given names
 */
async function findMatchingDirs(basePath: string, names: string[]): Promise<string | null> {
	for (const name of names) {
		const dirPath = join(basePath, name);
		if (existsSync(dirPath)) {
			const stats = await stat(dirPath);
			if (stats.isDirectory()) {
				return dirPath;
			}
		}
	}
	return null;
}

/**
 * Find content files in a directory (skills, agents, commands)
 */
async function findContentItems(
	dirPath: string,
	filePatterns: string[],
): Promise<Array<{ name: string; path: string; isFolder: boolean }>> {
	const items: Array<{ name: string; path: string; isFolder: boolean }> = [];

	if (!existsSync(dirPath)) {
		return items;
	}

	const entries = (await readdir(dirPath, { withFileTypes: true })).sort((a, b) =>
		a.name.localeCompare(b.name),
	);

	for (const entry of entries) {
		const entryPath = join(dirPath, entry.name);

		if (entry.isDirectory()) {
			// Check for content file inside directory
			for (const pattern of filePatterns) {
				if (existsSync(join(entryPath, pattern))) {
					items.push({
						name: entry.name,
						path: entryPath,
						isFolder: true,
					});
					break;
				}
			}
		} else if (entry.isFile() && entry.name.endsWith(".md")) {
			// Single file content (e.g., agents/researcher.md)
			const name = entry.name.replace(/\.md$/i, "");
			items.push({
				name,
				path: entryPath,
				isFolder: false,
			});
		}
	}

	return items;
}

/**
 * Plugin metadata from .claude-plugin/plugin.json
 */
export interface PluginMetadata {
	name?: string;
	version?: string;
	description?: string;
	author?: {
		name?: string;
		email?: string;
	};
}

/**
 * Parse .claude-plugin/plugin.json if it exists
 */
async function parsePluginJson(dirPath: string): Promise<PluginMetadata | null> {
	const pluginJsonPath = join(dirPath, ".claude-plugin", "plugin.json");
	if (!existsSync(pluginJsonPath)) {
		return null;
	}

	try {
		const content = await readFile(pluginJsonPath, "utf-8");
		const data = JSON.parse(content);
		const result: PluginMetadata = {
			name: data.name,
			version: data.version,
			description: data.description,
		};
		if (data.author) {
			result.author = {
				name: data.author.name,
				email: data.author.email,
			};
		}
		return result;
	} catch (error) {
		console.warn(`Failed to parse plugin.json in ${dirPath}:`, error);
		return null;
	}
}

/**
 * Read README.md and extract description
 * Returns the first paragraph or the first 200 characters
 */
async function readReadmeDescription(dirPath: string): Promise<string | null> {
	const readmePath = join(dirPath, "README.md");
	if (!existsSync(readmePath)) {
		return null;
	}

	try {
		const content = await readFile(readmePath, "utf-8");
		// Remove markdown headers and get first non-empty paragraph
		const lines = content.split("\n");
		let description = "";
		let inCodeBlock = false;

		for (const line of lines) {
			const trimmed = line.trim();

			// Track code blocks
			if (trimmed.startsWith("```")) {
				inCodeBlock = !inCodeBlock;
				continue;
			}

			// Skip headers, empty lines, and code blocks
			if (
				inCodeBlock ||
				trimmed.startsWith("#") ||
				trimmed.length === 0 ||
				trimmed.startsWith("![")
			) {
				continue;
			}

			// Found content
			description += (description ? " " : "") + trimmed;

			// Stop at first paragraph (200 chars or first blank line after content)
			if (description.length >= 200) {
				break;
			}
		}

		if (description.length > 200) {
			description = `${description.substring(0, 197)}...`;
		}

		return description || null;
	} catch (error) {
		console.warn(`Failed to read README.md in ${dirPath}:`, error);
		return null;
	}
}

/**
 * Discover content in a wrapped repository
 */
export interface DiscoveredContent {
	skills: Array<{ name: string; path: string; isFolder: boolean }>;
	agents: Array<{ name: string; path: string; isFolder: boolean }>;
	commands: Array<{ name: string; path: string; isFolder: boolean }>;
	rulesDir: string | null;
	docsDir: string | null;
}

async function discoverContent(repoPath: string): Promise<DiscoveredContent> {
	const result: DiscoveredContent = {
		skills: [],
		agents: [],
		commands: [],
		rulesDir: null,
		docsDir: null,
	};

	// Find skills
	const skillsDir = await findMatchingDirs(repoPath, SKILL_DIRS);
	if (skillsDir) {
		result.skills = await findContentItems(skillsDir, SKILL_FILES);
	}

	// Find agents
	const agentsDir = await findMatchingDirs(repoPath, AGENT_DIRS);
	if (agentsDir) {
		result.agents = await findContentItems(agentsDir, AGENT_FILES);
	}

	// Find commands
	const commandsDir = await findMatchingDirs(repoPath, COMMAND_DIRS);
	if (commandsDir) {
		result.commands = await findContentItems(commandsDir, COMMAND_FILES);
	}

	// Find rules directory
	result.rulesDir = await findMatchingDirs(repoPath, RULE_DIRS);

	// Find docs directory
	result.docsDir = await findMatchingDirs(repoPath, DOC_DIRS);

	return result;
}

/**
 * Generate a capability.toml for a wrapped repository
 */
async function generateCapabilityToml(
	id: string,
	repoPath: string,
	source: string,
	commit: string,
	content: DiscoveredContent,
): Promise<void> {
	const shortHash = shortCommit(commit);

	// Try to get metadata from plugin.json
	const pluginMeta = await parsePluginJson(repoPath);

	// Try to get description from README
	const readmeDesc = await readReadmeDescription(repoPath);

	// Build description based on available sources
	let description: string;
	if (pluginMeta?.description) {
		description = pluginMeta.description;
	} else if (readmeDesc) {
		description = readmeDesc;
	} else {
		// Fallback: build from discovered content
		const parts: string[] = [];
		if (content.skills.length > 0) {
			parts.push(`${content.skills.length} skill${content.skills.length > 1 ? "s" : ""}`);
		}
		if (content.agents.length > 0) {
			parts.push(`${content.agents.length} agent${content.agents.length > 1 ? "s" : ""}`);
		}
		if (content.commands.length > 0) {
			parts.push(`${content.commands.length} command${content.commands.length > 1 ? "s" : ""}`);
		}
		description = parts.length > 0 ? `${parts.join(", ")}` : `Wrapped from ${source}`;
	}

	// Use plugin metadata for name and version if available
	const name = pluginMeta?.name || `${id} (wrapped)`;
	const version = pluginMeta?.version || shortHash;

	// Extract repository URL for metadata
	const repoUrl = source.startsWith("github:")
		? `https://github.com/${source.replace("github:", "")}`
		: source;

	// Build TOML content
	let tomlContent = `# Auto-generated by OmniDev - DO NOT EDIT
# This capability was wrapped from an external repository

[capability]
id = "${id}"
name = "${name}"
version = "${version}"
description = "${description}"
`;

	// Add author if available from plugin.json
	if (pluginMeta?.author?.name || pluginMeta?.author?.email) {
		tomlContent += "\n[capability.author]\n";
		if (pluginMeta.author.name) {
			tomlContent += `name = "${pluginMeta.author.name}"\n`;
		}
		if (pluginMeta.author.email) {
			tomlContent += `email = "${pluginMeta.author.email}"\n`;
		}
	}

	// Add metadata section
	tomlContent += `
[capability.metadata]
repository = "${repoUrl}"
wrapped = true
commit = "${commit}"
`;

	await writeFile(join(repoPath, "capability.toml"), tomlContent, "utf-8");
}

/**
 * Generate capability.toml for a file-sourced capability
 */
async function generateFileCapabilityToml(
	id: string,
	targetPath: string,
	sourcePath: string,
	contentHash: string,
	content: DiscoveredContent,
): Promise<void> {
	const shortHash = contentHash.substring(0, 12);

	// Build description based on discovered content
	const parts: string[] = [];
	if (content.skills.length > 0) {
		parts.push(`${content.skills.length} skill${content.skills.length > 1 ? "s" : ""}`);
	}
	if (content.agents.length > 0) {
		parts.push(`${content.agents.length} agent${content.agents.length > 1 ? "s" : ""}`);
	}
	if (content.commands.length > 0) {
		parts.push(`${content.commands.length} command${content.commands.length > 1 ? "s" : ""}`);
	}

	const description =
		parts.length > 0
			? `Copied from ${sourcePath} (${parts.join(", ")})`
			: `Copied from ${sourcePath}`;

	const tomlContent = `# Auto-generated by OmniDev - DO NOT EDIT
# This capability was copied from a local file source

[capability]
id = "${id}"
name = "${id} (file source)"
version = "${shortHash}"
description = "${description}"

[capability.metadata]
source_path = "${sourcePath}"
wrapped = true
content_hash = "${contentHash}"
`;

	await writeFile(join(targetPath, "capability.toml"), tomlContent, "utf-8");
}

/**
 * Fetch a file-sourced capability (copy from local path)
 */
async function fetchFileCapabilitySource(
	id: string,
	config: FileCapabilitySourceConfig,
	options?: { silent?: boolean },
): Promise<FetchResult> {
	const sourcePath = parseFilePath(config.source);
	const targetPath = getSourceCapabilityPath(id);

	// Verify source exists
	if (!existsSync(sourcePath)) {
		throw new Error(`File source not found: ${sourcePath}`);
	}

	// Calculate content hash of source
	const sourceHash = await calculateDirectoryHash(sourcePath);

	// Check if we need to update
	let updated = false;
	let existingHash: string | undefined;

	if (existsSync(targetPath)) {
		// Calculate existing hash to compare
		existingHash = await calculateDirectoryHash(targetPath);
		updated = existingHash !== sourceHash;
	} else {
		updated = true;
	}

	if (updated) {
		if (!options?.silent) {
			console.log(`  Copying ${id} from ${config.source}...`);
		}

		// Remove existing target if it exists
		if (existsSync(targetPath)) {
			await rm(targetPath, { recursive: true });
		}

		// Copy source to target
		await mkdir(join(targetPath, ".."), { recursive: true });
		await cp(sourcePath, targetPath, { recursive: true });

		// Check if we need to wrap (no capability.toml)
		const needsWrap = !hasCapabilityToml(targetPath);

		if (needsWrap) {
			// Discover content and generate capability.toml
			const content = await discoverContent(targetPath);
			await generateFileCapabilityToml(id, targetPath, config.source, sourceHash, content);

			if (!options?.silent) {
				const parts: string[] = [];
				if (content.skills.length > 0) parts.push(`${content.skills.length} skills`);
				if (content.agents.length > 0) parts.push(`${content.agents.length} agents`);
				if (content.commands.length > 0) parts.push(`${content.commands.length} commands`);
				if (parts.length > 0) {
					console.log(`    Wrapped: ${parts.join(", ")}`);
				}
			}
		}
	} else {
		if (!options?.silent) {
			console.log(`  Checking ${id}...`);
		}
	}

	// Get version from capability.toml or package.json
	const shortHash = sourceHash.substring(0, 12);
	let version = shortHash;
	const pkgJsonPath = join(targetPath, "package.json");
	if (existsSync(pkgJsonPath)) {
		try {
			const pkgJson = JSON.parse(await readFile(pkgJsonPath, "utf-8"));
			if (pkgJson.version) {
				version = pkgJson.version;
			}
		} catch {
			// Ignore parse errors
		}
	}

	return {
		id,
		path: targetPath,
		version,
		contentHash: sourceHash,
		updated,
		wrapped: !hasCapabilityToml(sourcePath),
	};
}

/**
 * Fetch a git-sourced capability
 */
async function fetchGitCapabilitySource(
	id: string,
	config: GitCapabilitySourceConfig,
	options?: { silent?: boolean },
): Promise<FetchResult> {
	const gitUrl = sourceToGitUrl(config.source);
	const targetPath = getSourceCapabilityPath(id);

	let updated = false;
	let commit: string;
	let repoPath: string;

	// If path is specified, clone to temp location first
	if (config.path) {
		const tempPath = join(OMNI_LOCAL, "_temp", `${id}-repo`);

		// Check if already cloned to temp
		if (existsSync(join(tempPath, ".git"))) {
			if (!options?.silent) {
				console.log(`  Checking ${id}...`);
			}
			updated = await fetchRepo(tempPath, config.ref);
			commit = await getRepoCommit(tempPath);
		} else {
			if (!options?.silent) {
				console.log(`  Cloning ${id} from ${config.source}...`);
			}
			await mkdir(join(tempPath, ".."), { recursive: true });
			await cloneRepo(gitUrl, tempPath, config.ref);
			commit = await getRepoCommit(tempPath);
			updated = true;
		}

		// Copy subdirectory to target
		const sourcePath = join(tempPath, config.path);
		if (!existsSync(sourcePath)) {
			throw new Error(`Path not found in repository: ${config.path}`);
		}

		// Remove old target and copy new content
		if (existsSync(targetPath)) {
			await rm(targetPath, { recursive: true });
		}
		await mkdir(join(targetPath, ".."), { recursive: true });
		await cp(sourcePath, targetPath, { recursive: true });

		repoPath = targetPath;
	} else {
		// Clone directly to target (no subdirectory)
		if (existsSync(join(targetPath, ".git"))) {
			if (!options?.silent) {
				console.log(`  Checking ${id}...`);
			}
			updated = await fetchRepo(targetPath, config.ref);
			commit = await getRepoCommit(targetPath);
		} else {
			if (!options?.silent) {
				console.log(`  Cloning ${id} from ${config.source}...`);
			}
			await cloneRepo(gitUrl, targetPath, config.ref);
			commit = await getRepoCommit(targetPath);
			updated = true;
		}

		repoPath = targetPath;
	}

	// Auto-detect if we need to wrap
	let needsWrap = false;
	if (!hasCapabilityToml(repoPath)) {
		needsWrap = await shouldWrapDirectory(repoPath);
	}

	if (needsWrap && updated) {
		// Discover content and generate capability.toml
		const content = await discoverContent(repoPath);
		await generateCapabilityToml(id, repoPath, config.source, commit, content);

		if (!options?.silent) {
			const parts: string[] = [];
			if (content.skills.length > 0) parts.push(`${content.skills.length} skills`);
			if (content.agents.length > 0) parts.push(`${content.agents.length} agents`);
			if (content.commands.length > 0) parts.push(`${content.commands.length} commands`);
			if (parts.length > 0) {
				console.log(`    Wrapped: ${parts.join(", ")}`);
			}
		}
	}

	// Get version from capability.toml or package.json
	let version = shortCommit(commit);
	const pkgJsonPath = join(repoPath, "package.json");
	if (existsSync(pkgJsonPath)) {
		try {
			const pkgJson = JSON.parse(await readFile(pkgJsonPath, "utf-8"));
			if (pkgJson.version) {
				version = pkgJson.version;
			}
		} catch {
			// Ignore parse errors
		}
	}

	return {
		id,
		path: targetPath,
		version,
		commit,
		updated,
		wrapped: needsWrap,
	};
}

/**
 * Fetch a single capability source (git or file)
 */
export async function fetchCapabilitySource(
	id: string,
	sourceConfig: CapabilitySourceConfig,
	options?: { silent?: boolean },
): Promise<FetchResult> {
	const config = parseSourceConfig(sourceConfig);

	// Dispatch based on source type
	if (isFileSourceConfig(config)) {
		return fetchFileCapabilitySource(id, config, options);
	}

	return fetchGitCapabilitySource(id, config, options);
}

/**
 * Generate capability.toml content for an MCP server definition
 */
function generateMcpCapabilityTomlContent(
	id: string,
	mcpConfig: import("../types/index.js").McpConfig,
): string {
	const capabilityId = `_mcps-${id}`;

	let tomlContent = `# Auto-generated by OmniDev from omni.toml [mcps] section - DO NOT EDIT

[capability]
id = "${capabilityId}"
name = "${id} (MCP)"
version = "1.0.0"
description = "MCP server defined in omni.toml"

[capability.metadata]
wrapped = true
generated_from_omni_toml = true

[mcp]
command = "${mcpConfig.command}"
`;

	if (mcpConfig.args && mcpConfig.args.length > 0) {
		tomlContent += `args = ${JSON.stringify(mcpConfig.args)}\n`;
	}

	if (mcpConfig.transport) {
		tomlContent += `transport = "${mcpConfig.transport}"\n`;
	}

	if (mcpConfig.cwd) {
		tomlContent += `cwd = "${mcpConfig.cwd}"\n`;
	}

	if (mcpConfig.env && Object.keys(mcpConfig.env).length > 0) {
		tomlContent += `\n[mcp.env]\n`;
		for (const [key, value] of Object.entries(mcpConfig.env)) {
			tomlContent += `${key} = "${value}"\n`;
		}
	}

	return tomlContent;
}

/**
 * Generate synthetic capability for an MCP server definition
 */
async function generateMcpCapabilityToml(
	id: string,
	mcpConfig: import("../types/index.js").McpConfig,
	targetPath: string,
): Promise<void> {
	const tomlContent = generateMcpCapabilityTomlContent(id, mcpConfig);
	await writeFile(join(targetPath, "capability.toml"), tomlContent, "utf-8");
}

/**
 * Clean up stale MCP capabilities that are no longer in config
 */
async function cleanupStaleMcpCapabilities(currentMcpIds: Set<string>): Promise<void> {
	const capabilitiesDir = join(OMNI_LOCAL, "capabilities");
	if (!existsSync(capabilitiesDir)) {
		return;
	}

	const entries = await readdir(capabilitiesDir, { withFileTypes: true });

	for (const entry of entries) {
		if (entry.isDirectory() && entry.name.startsWith("_mcps-")) {
			if (!currentMcpIds.has(entry.name)) {
				// This MCP capability is no longer in omni.toml, remove it
				await rm(join(capabilitiesDir, entry.name), { recursive: true });
			}
		}
	}
}

/**
 * Generate synthetic capabilities for MCP definitions in omni.toml
 */
export async function generateMcpCapabilities(config: OmniConfig): Promise<void> {
	if (!config.mcps || Object.keys(config.mcps).length === 0) {
		// Clean up all MCP capabilities if mcps section is empty
		await cleanupStaleMcpCapabilities(new Set());
		return;
	}

	const mcpCapabilitiesDir = join(OMNI_LOCAL, "capabilities");
	const currentMcpIds = new Set<string>();

	for (const [id, mcpConfig] of Object.entries(config.mcps)) {
		const capabilityId = `_mcps-${id}`;
		const targetPath = join(mcpCapabilitiesDir, capabilityId);
		currentMcpIds.add(capabilityId);

		// Create directory
		await mkdir(targetPath, { recursive: true });

		// Generate capability.toml
		await generateMcpCapabilityToml(id, mcpConfig, targetPath);
	}

	// Cleanup stale MCP capabilities
	await cleanupStaleMcpCapabilities(currentMcpIds);
}

/**
 * Fetch all capability sources from config
 */
export async function fetchAllCapabilitySources(
	config: OmniConfig,
	options?: { silent?: boolean; force?: boolean },
): Promise<FetchResult[]> {
	// Generate MCP capabilities FIRST
	await generateMcpCapabilities(config);

	const sources = config.capabilities?.sources;
	if (!sources || Object.keys(sources).length === 0) {
		return [];
	}

	if (!options?.silent) {
		console.log("Fetching capability sources...");
	}

	const results: FetchResult[] = [];
	const lockFile = await loadLockFile();
	let lockUpdated = false;

	for (const [id, source] of Object.entries(sources)) {
		try {
			const result = await fetchCapabilitySource(id, source, options);
			results.push(result);

			const sourceConfig = parseSourceConfig(source);

			// Build lock entry based on source type
			const lockEntry: CapabilityLockEntry = {
				source: typeof source === "string" ? source : source.source,
				version: result.version,
				updated_at: new Date().toISOString(),
			};

			if (isFileSourceConfig(sourceConfig)) {
				// File source: use content hash
				if (result.contentHash) {
					lockEntry.content_hash = result.contentHash;
				}
			} else {
				// Git source: use commit and ref
				const gitConfig = sourceConfig as GitCapabilitySourceConfig;
				if (result.commit) {
					lockEntry.commit = result.commit;
				}
				if (gitConfig.ref) {
					lockEntry.ref = gitConfig.ref;
				}
			}

			// Check if lock entry changed
			const existing = lockFile.capabilities[id];
			const hasChanged = isFileSourceConfig(sourceConfig)
				? !existing || existing.content_hash !== result.contentHash
				: !existing || existing.commit !== result.commit;

			if (hasChanged) {
				lockFile.capabilities[id] = lockEntry;
				lockUpdated = true;

				if (!options?.silent && result.updated) {
					const oldVersion = existing?.version || "new";
					console.log(`  ${result.wrapped ? "+" : "~"} ${id}: ${oldVersion} -> ${result.version}`);
				}
			}
		} catch (error) {
			console.error(`  Failed to fetch ${id}: ${error}`);
		}
	}

	// Save lock file if changed
	if (lockUpdated) {
		await saveLockFile(lockFile);
	}

	if (!options?.silent && results.length > 0) {
		const updated = results.filter((r) => r.updated).length;
		if (updated > 0) {
			console.log(`  Updated ${updated} capability source(s)`);
		} else {
			console.log(`  All ${results.length} source(s) up to date`);
		}
	}

	return results;
}

/**
 * Check for available updates without applying them
 */
export async function checkForUpdates(config: OmniConfig): Promise<SourceUpdateInfo[]> {
	const sources = config.capabilities?.sources;
	if (!sources || Object.keys(sources).length === 0) {
		return [];
	}

	const lockFile = await loadLockFile();
	const updates: SourceUpdateInfo[] = [];

	for (const [id, source] of Object.entries(sources)) {
		const sourceConfig = parseSourceConfig(source);
		const targetPath = getSourceCapabilityPath(id);
		const existing = lockFile.capabilities[id];

		// Handle file sources
		if (isFileSourceConfig(sourceConfig)) {
			const sourcePath = parseFilePath(sourceConfig.source);

			if (!existsSync(sourcePath)) {
				updates.push({
					id,
					source: sourceConfig.source,
					currentVersion: existing?.version || "unknown",
					latestVersion: "source missing",
					hasUpdate: false,
				});
				continue;
			}

			if (!existsSync(targetPath)) {
				updates.push({
					id,
					source: sourceConfig.source,
					currentVersion: "not installed",
					latestVersion: "available",
					hasUpdate: true,
				});
				continue;
			}

			// Calculate current hash of source
			const sourceHash = await calculateDirectoryHash(sourcePath);
			const currentHash = existing?.content_hash || "";

			updates.push({
				id,
				source: sourceConfig.source,
				currentVersion:
					existing?.version || (currentHash ? currentHash.substring(0, 12) : "unknown"),
				latestVersion: sourceHash.substring(0, 12),
				hasUpdate: currentHash !== sourceHash,
			});
			continue;
		}

		// Handle git sources
		const gitConfig = sourceConfig as GitCapabilitySourceConfig;

		if (!existsSync(join(targetPath, ".git"))) {
			// Not yet cloned
			updates.push({
				id,
				source: gitConfig.source,
				currentVersion: "not installed",
				latestVersion: "unknown",
				hasUpdate: true,
			});
			continue;
		}

		// Fetch to check for updates (without pulling)
		const fetchProc = Bun.spawn(["git", "fetch", "--depth", "1", "origin"], {
			cwd: targetPath,
			stdout: "pipe",
			stderr: "pipe",
		});
		await fetchProc.exited;

		// Get remote commit
		const targetRef = gitConfig.ref || "HEAD";
		const lsProc = Bun.spawn(["git", "ls-remote", "origin", targetRef], {
			cwd: targetPath,
			stdout: "pipe",
			stderr: "pipe",
		});
		const lsOutput = await new Response(lsProc.stdout).text();
		await lsProc.exited;

		const remoteCommit = lsOutput.split("\t")[0] || "";
		const currentCommit = existing?.commit || "";

		updates.push({
			id,
			source: gitConfig.source,
			currentVersion: existing?.version || (currentCommit ? shortCommit(currentCommit) : "unknown"),
			latestVersion: remoteCommit ? shortCommit(remoteCommit) : "unknown",
			hasUpdate: currentCommit !== remoteCommit,
		});
	}

	return updates;
}
