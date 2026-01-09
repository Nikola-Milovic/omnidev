/**
 * omni_query tool implementation
 *
 * Searches across capabilities, skills, and docs. Returns type definitions when requested.
 */

import type { CapabilityRegistry } from "@omnidev/core";

interface QueryArgs {
	query?: string;
	limit?: number;
	include_types?: boolean;
}

/**
 * Handle omni_query tool calls
 *
 * @param registry - Capability registry to search
 * @param args - Query arguments (query, limit, include_types)
 * @returns MCP tool response with search results
 */
export async function handleOmniQuery(
	registry: CapabilityRegistry,
	args: unknown,
): Promise<{ content: Array<{ type: string; text: string }> }> {
	const { query = "", limit = 10, include_types = false } = (args as QueryArgs) || {};

	const results: string[] = [];

	// If no query, return summary
	if (!query.trim()) {
		const capabilities = registry.getAllCapabilities();
		results.push(`Enabled capabilities (${capabilities.length}):`);
		for (const cap of capabilities) {
			results.push(`  - ${cap.id}: ${cap.config.capability.description}`);
		}
	} else {
		// Search capabilities, skills, docs
		const queryLower = query.toLowerCase();

		// Search capabilities
		for (const cap of registry.getAllCapabilities()) {
			if (
				cap.id.toLowerCase().includes(queryLower) ||
				cap.config.capability.description.toLowerCase().includes(queryLower)
			) {
				results.push(`[capability:${cap.id}] ${cap.config.capability.description}`);
			}
		}

		// Search skills
		for (const skill of registry.getAllSkills()) {
			if (
				skill.name.toLowerCase().includes(queryLower) ||
				skill.description.toLowerCase().includes(queryLower)
			) {
				results.push(`[skill:${skill.capabilityId}/${skill.name}] ${skill.description}`);
			}
		}

		// Search docs
		for (const doc of registry.getAllDocs()) {
			if (
				doc.name.toLowerCase().includes(queryLower) ||
				doc.content.toLowerCase().includes(queryLower)
			) {
				const snippet = doc.content.slice(0, 100).replace(/\n/g, " ");
				results.push(`[doc:${doc.capabilityId}/${doc.name}] ${snippet}...`);
			}
		}
	}

	// Add type definitions if requested
	let typeDefinitions = "";
	if (include_types || !query.trim()) {
		typeDefinitions = generateTypeDefinitions(registry);
	}

	const limitedResults = results.slice(0, limit);
	let response = limitedResults.join("\n");

	if (typeDefinitions) {
		response += `\n\n--- Type Definitions ---\n\n${typeDefinitions}`;
	}

	return {
		content: [
			{
				type: "text",
				text: response,
			},
		],
	};
}

/**
 * Generate TypeScript type definitions for all enabled capabilities
 *
 * @param registry - Capability registry
 * @returns TypeScript type definitions as string
 */
function generateTypeDefinitions(registry: CapabilityRegistry): string {
	let dts = "// Auto-generated type definitions for enabled capabilities\n\n";

	for (const cap of registry.getAllCapabilities()) {
		const moduleName = cap.config.exports?.module ?? cap.id;
		dts += `declare module '${moduleName}' {\n`;

		if (cap.typeDefinitions) {
			// Indent each line
			const indented = cap.typeDefinitions
				.split("\n")
				.map((line) => `  ${line}`)
				.join("\n");
			dts += indented;
		} else {
			dts += "  // No type definitions available\n";
		}

		dts += "\n}\n\n";
	}

	return dts;
}
