/**
 * Ralph Type Definitions
 *
 * TypeScript types for PRD-driven development orchestration.
 */

/**
 * User Story definition
 */
export interface Story {
	/** Unique story identifier (e.g., US-001) */
	id: string;
	/** Story title */
	title: string;
	/** Path to spec file relative to PRD directory */
	specFile: string;
	/** Scope of work for this story */
	scope: string;
	/** Verifiable acceptance criteria */
	acceptanceCriteria: string[];
	/** Priority (lower = higher priority) */
	priority: number;
	/** Whether the story passes all acceptance criteria */
	passes: boolean;
	/** Optional notes about the story */
	notes: string;
}

/**
 * Product Requirements Document
 */
export interface PRD {
	/** PRD name (unique identifier) */
	name: string;
	/** Git branch name for this work */
	branchName: string;
	/** Description of the work */
	description: string;
	/** ISO timestamp of creation */
	createdAt: string;
	/** List of user stories */
	userStories: Story[];
}

/**
 * Agent configuration
 */
export interface AgentConfig {
	/** Command to spawn the agent */
	command: string;
	/** Arguments for the agent command */
	args: string[];
}

/**
 * Ralph configuration
 */
export interface RalphConfig {
	/** Default agent to use */
	default_agent: string;
	/** Default max iterations */
	default_iterations: number;
	/** Whether to auto-archive completed PRDs */
	auto_archive: boolean;
	/** Available agents */
	agents: Record<string, AgentConfig>;
}
