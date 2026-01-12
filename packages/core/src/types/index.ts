// Capability Export Types (for capability developers)
export * from "./capability-export.js";

// Capability Types
export interface CapabilityMetadata {
	id: string;
	name: string;
	version: string;
	description: string;
	/** Optional metadata about the capability author and source */
	metadata?: {
		author?: string;
		repository?: string;
		license?: string;
	};
}

export interface CapabilityExports {
	module?: string;
	gitignore?: string[];
}

export interface EnvDeclaration {
	required?: boolean;
	secret?: boolean;
	default?: string;
}

export interface SyncConfig {
	on_sync?: string;
}

export interface CliConfig {
	commands?: string[];
}

export interface CapabilityConfig {
	capability: CapabilityMetadata;
	exports?: CapabilityExports;
	env?: Record<string, EnvDeclaration | Record<string, never>>;
	mcp?: McpConfig;
	sync?: SyncConfig;
	cli?: CliConfig;
}

export type McpTransport = "stdio" | "sse" | "http";

export interface McpToolSchema {
	name: string;
	description: string;
	inputSchema: Record<string, unknown>;
}

export interface McpConfig {
	command: string;
	args?: string[];
	env?: Record<string, string>;
	cwd?: string;
	transport?: McpTransport;
	tools?: McpToolSchema[];
}

// Content Types
export interface Skill {
	name: string;
	description: string;
	instructions: string;
	capabilityId: string;
}

export interface Rule {
	name: string;
	content: string;
	capabilityId: string;
}

export interface Doc {
	name: string;
	content: string;
	capabilityId: string;
}

export type SubagentModel = "sonnet" | "opus" | "haiku" | "inherit";
export type SubagentPermissionMode =
	| "default"
	| "acceptEdits"
	| "dontAsk"
	| "bypassPermissions"
	| "plan";

export interface SubagentHookConfig {
	matcher?: string;
	hooks: {
		type: "command";
		command: string;
	}[];
}

export interface SubagentHooks {
	PreToolUse?: SubagentHookConfig[];
	PostToolUse?: SubagentHookConfig[];
	Stop?: SubagentHookConfig[];
}

export interface Subagent {
	/** Unique identifier using lowercase letters and hyphens */
	name: string;
	/** When Claude should delegate to this subagent */
	description: string;
	/** System prompt that guides the subagent's behavior */
	systemPrompt: string;
	/** Tools the subagent can use (inherits all if omitted) */
	tools?: string[];
	/** Tools to deny (removed from inherited or specified list) */
	disallowedTools?: string[];
	/** Model to use: sonnet, opus, haiku, or inherit */
	model?: SubagentModel;
	/** Permission mode for the subagent */
	permissionMode?: SubagentPermissionMode;
	/** Skills to load into the subagent's context at startup */
	skills?: string[];
	/** Lifecycle hooks scoped to this subagent */
	hooks?: SubagentHooks;
	/** Capability that provides this subagent */
	capabilityId: string;
}

// Remote Capability Types
export type RemoteCapabilitySourceType = "github" | "git" | "git-ssh";

export interface RemoteCapabilitySource {
	/** Source URL or shorthand (e.g., "github:user/repo") */
	source: string;
	/** Git ref to checkout: tag, branch, or commit hash */
	ref?: string;
	/** Subdirectory within the repo containing the capability */
	path?: string;
	/** Type of capability: "full" (default) or "skills" (skills-only repo) */
	type?: "full" | "skills";
	/** For monorepos: specific capabilities to extract */
	capabilities?: string[];
}

export interface RemoteCapabilityLock {
	/** Original source reference */
	source: string;
	/** Exact commit hash */
	commit: string;
	/** Version from capability.toml or package.json */
	version: string;
	/** Pinned ref if specified */
	ref?: string;
	/** Last sync timestamp (ISO 8601) */
	synced_at: string;
}

export interface RemoteLockFile {
	capabilities: Record<string, RemoteCapabilityLock>;
}

export interface RemoteCapabilitiesConfig {
	capabilities?: Record<string, string | RemoteCapabilitySource>;
}

// Config Types
export interface ProfileConfig {
	capabilities?: string[];
}

export interface OmniConfig {
	project?: string;
	active_profile?: string;
	always_enabled_capabilities?: string[];
	env?: Record<string, string>;
	profiles?: Record<string, ProfileConfig>;
	providers?: {
		enabled?: Provider[];
	};
	/** Remote capabilities configuration */
	remote?: RemoteCapabilitiesConfig;
}

// Provider Types
export type Provider = "claude" | "codex";

export interface ProviderConfig {
	provider?: Provider;
	providers?: Provider[];
}

export function getActiveProviders(config: ProviderConfig): Provider[] {
	if (config.providers) return config.providers;
	if (config.provider) return [config.provider];
	return ["claude"]; // Default
}

// Capability Source Types
export type CapabilitySourceType = "built-in" | "local" | "remote";

export interface CapabilitySource {
	type: CapabilitySourceType;
	/** For remote capabilities: the source URL/shorthand */
	remote?: string;
	/** For remote capabilities: the pinned ref if any */
	ref?: string;
	/** For remote capabilities: the current commit hash */
	commit?: string;
}

// Loaded Capability
export interface LoadedCapability {
	id: string;
	path: string;
	config: CapabilityConfig;
	skills: Skill[];
	rules: Rule[];
	docs: Doc[];
	subagents: Subagent[];
	typeDefinitions?: string;
	gitignore?: string[];
	exports: Record<string, unknown>;
	/** Where this capability comes from */
	source?: CapabilitySource;
}
