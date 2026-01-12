/**
 * YAML Frontmatter Parser Utility
 *
 * Consolidates YAML frontmatter parsing logic that was duplicated across
 * skills.ts, commands.ts, and subagents.ts.
 *
 * This utility provides:
 * - parseSimpleYamlFrontmatter: Parse key: value pairs from YAML
 * - parseFrontmatterWithMarkdown: Extract frontmatter + markdown content
 */

/**
 * Parse simple YAML key: value pairs
 * Supports basic key: value syntax (not full YAML spec)
 * Handles quoted and unquoted values
 *
 * @param yaml - YAML content string to parse
 * @returns Record of key-value pairs
 */
export function parseSimpleYamlFrontmatter<T>(yaml: string): T {
	const result: Record<string, string> = {};

	for (const line of yaml.split("\n")) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith("#")) {
			continue;
		}

		// Support: key: value and key: "quoted value"
		const colonIndex = trimmed.indexOf(":");
		if (colonIndex === -1) {
			continue;
		}

		const rawKey = trimmed.slice(0, colonIndex).trim();
		let value = trimmed.slice(colonIndex + 1).trim();

		// Remove quotes if present (double or single)
		if (
			(value.startsWith('"') && value.endsWith('"')) ||
			(value.startsWith("'") && value.endsWith("'"))
		) {
			value = value.slice(1, -1);
		}

		// Convert kebab-case to camelCase
		const key = rawKey.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase());

		result[key] = value;
	}

	return result as unknown as T;
}

/**
 * Parse content with YAML frontmatter separated from markdown
 * Expected format:
 * ```
 * ---
 * key: value
 * ---
 * Markdown content here
 * ```
 *
 * @param content - Full content with frontmatter and markdown
 * @returns Object with frontmatter (parsed) and markdown (remaining) or null if no frontmatter
 */
export function parseFrontmatterWithMarkdown<T>(
	content: string,
): { frontmatter: T; markdown: string } | null {
	const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/s);

	if (!match?.[1] || match[2] === undefined) {
		return null;
	}

	const frontmatter = parseSimpleYamlFrontmatter<T>(match[1]);
	const markdown = match[2];

	return { frontmatter, markdown };
}
