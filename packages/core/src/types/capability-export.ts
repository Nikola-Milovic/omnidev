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
 * MCP Tool export structure
 *
 * TODO: Define complete MCP tool interface following MCP protocol specification
 */
export interface McpToolExport {
	name: string;
	description: string;
	// ... MCP tool schema
	[key: string]: unknown;
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

	/** MCP tools provided by this capability */
	mcpTools?: Record<string, McpToolExport>;

	/** Documentation (programmatic - optional, can also use docs/ directory) */
	docs?: DocExport[];

	/** Rules (programmatic - optional, can also use rules/ directory) */
	rules?: string[]; // Array of markdown content strings

	/** Skills (programmatic - optional, can also use skills/ directory) */
	skills?: SkillExport[];

	/** Gitignore patterns */
	gitignore?: string[];

	/** Custom sync hook function */
	sync?: () => Promise<void>;

	/** Additional exports for extensibility */
	[key: string]: unknown;
}
