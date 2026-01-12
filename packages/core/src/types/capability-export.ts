/**
 * Capability Export Types
 *
 * These types define the structure that capabilities use to export their features.
 * Capabilities should import these types from @omnidev/core and use them in their index.ts.
 */

/**
 * File content structure for programmatic file creation
 */
export interface FileContent {
	/** File name (relative path within capability) */
	name: string;

	/** File content */
	content: string;
}

/**
 * Documentation export structure
 */
export interface DocExport {
	/** Document title */
	title: string;

	/** Markdown content */
	content: string;
}

/**
 * Skill export structure
 */
export interface SkillExport {
	/** SKILL.md content (markdown with YAML frontmatter) */
	skillMd: string;

	/** Optional: Reference files to create (files the skill needs access to) */
	references?: FileContent[];

	/** Optional: Additional files to create (templates, examples, etc.) */
	additionalFiles?: FileContent[];
}

/**
 * JSON Schema type for tool parameters
 */
export interface JSONSchema {
	type?: string | string[];
	properties?: Record<string, JSONSchema>;
	required?: string[];
	items?: JSONSchema;
	enum?: unknown[];
	description?: string;
	default?: unknown;
	[key: string]: unknown;
}

/**
 * Subagent export structure
 *
 * Defines a subagent that Claude can delegate tasks to.
 * Uses YAML frontmatter in markdown format for configuration.
 *
 * @example
 * ```typescript
 * const codeReviewer: SubagentExport = {
 *   subagentMd: `---
 * name: code-reviewer
 * description: Reviews code for quality and best practices
 * tools: Read, Glob, Grep
 * model: sonnet
 * ---
 *
 * You are a code reviewer. When invoked, analyze the code and provide
 * specific, actionable feedback on quality, security, and best practices.`
 * };
 * ```
 */
export interface SubagentExport {
	/** SUBAGENT.md content (markdown with YAML frontmatter) */
	subagentMd: string;
}

/**
 * Slash command export structure
 *
 * Defines a slash command that can be invoked in Claude Code.
 * Uses YAML frontmatter in markdown format for configuration.
 *
 * @example
 * ```typescript
 * const fixIssue: CommandExport = {
 *   commandMd: `---
 * name: fix-issue
 * description: Fix a GitHub issue following coding standards
 * allowed-tools: Bash(git add:*), Bash(git commit:*)
 * ---
 *
 * Fix issue #$ARGUMENTS following our coding standards.
 *
 * 1. Read the issue details
 * 2. Implement the fix
 * 3. Write tests
 * 4. Create a commit`
 * };
 * ```
 */
export interface CommandExport {
	/** COMMAND.md content (markdown with YAML frontmatter) */
	commandMd: string;
}

/**
 * Sandbox tool export structure
 *
 * Defines a tool that can be called from sandbox code via omni_execute.
 * Full schema is required for proper introspection and type generation.
 *
 * For MCP wrapper capabilities, these are auto-discovered from the child MCP.
 * For custom capabilities, these must be explicitly defined with full schemas.
 *
 * @example
 * ```typescript
 * const createTask: SandboxToolExport = {
 *   name: "createTask",
 *   description: "Create a new task",
 *   inputSchema: {
 *     type: "object",
 *     properties: {
 *       title: { type: "string", description: "Task title" },
 *       priority: { type: "string", enum: ["low", "medium", "high"] }
 *     },
 *     required: ["title"]
 *   },
 *   outputSchema: {
 *     type: "object",
 *     properties: {
 *       id: { type: "string" },
 *       title: { type: "string" },
 *       createdAt: { type: "string" }
 *     }
 *   },
 *   specification: `/**
 *    * Create a new task in the task management system.
 *    * @param input.title - The title of the task (required)
 *    * @param input.priority - Priority level (default: "medium")
 *    * @returns The created task object with generated ID
 *    *\/`
 * };
 * ```
 */
export interface SandboxToolExport {
	/** Tool name (used as function name in sandbox) */
	name: string;

	/** Short description for overview listings */
	description: string;

	/** JSON Schema for input parameters (required for proper introspection) */
	inputSchema: JSONSchema;

	/** JSON Schema for output/return value */
	outputSchema?: JSONSchema;

	/**
	 * Full specification/documentation for the tool.
	 * Can include JSDoc, examples, detailed behavior notes.
	 * This is shown when requesting full details for a specific tool.
	 */
	specification?: string;
}

/**
 * Complete capability export structure
 *
 * Capabilities export this as their default export from index.ts.
 * All content fields are OPTIONAL and PROGRAMMATIC.
 * Capabilities can also provide content via static files in their directory.
 * Both approaches are supported and will be merged during sync.
 *
 * @example
 * ```typescript
 * // Static files approach - just export CLI commands
 * export default {
 *   cliCommands: { mycap: myRoutes },
 *   gitignore: ["mycap/"],
 *   sync
 * } satisfies CapabilityExport;
 * ```
 *
 * @example
 * ```typescript
 * // Programmatic approach - generate content dynamically
 * export default {
 *   cliCommands: { mycap: myRoutes },
 *   docs: [{ title: "Guide", content: "# Guide\n..." }],
 *   rules: ["# Rule content..."],
 *   skills: [{ skillMd: "...", references: [...] }],
 *   gitignore: ["mycap/"],
 *   sync
 * } satisfies CapabilityExport;
 * ```
 */
export interface CapabilityExport {
	/** CLI commands provided by this capability */
	cliCommands?: Record<string, unknown>; // stricli Command type

	/** Sandbox tools provided by this capability (callable from omni_execute) */
	sandboxTools?: Record<string, SandboxToolExport>;

	/** Documentation (programmatic - optional, can also use docs/ directory) */
	docs?: DocExport[];

	/** Rules (programmatic - optional, can also use rules/ directory) */
	rules?: string[]; // Array of markdown content strings

	/** Skills (programmatic - optional, can also use skills/ directory) */
	skills?: SkillExport[];

	/** Subagents (programmatic - optional, can also use subagents/ directory) */
	subagents?: SubagentExport[];

	/** Commands (programmatic - optional, can also use commands/ directory) */
	commands?: CommandExport[];

	/** Gitignore patterns */
	gitignore?: string[];

	/** Custom sync hook function */
	sync?: () => Promise<void>;

	/** Additional exports for extensibility */
	[key: string]: unknown;
}
