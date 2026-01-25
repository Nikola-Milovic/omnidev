/**
 * Type definitions for @omnidev-ai/capability
 */

// CLI command types
export type {
	CapabilityFlag,
	CapabilityFlagKind,
	CapabilityPositional,
	CapabilityPositionalKind,
	CapabilityParameters,
	CapabilityCommand,
	CapabilityCommandFunc,
	CapabilityRouteMap,
	CapabilityRoute,
} from "./cli";

export { isCapabilityCommand, isCapabilityRouteMap } from "./cli";

// Capability export types
export type {
	FileContent,
	DocExport,
	SkillExport,
	SubagentExport,
	CommandExport,
	CapabilityExport,
} from "./exports";
