export default {
	extends: ["@commitlint/config-conventional"],
	rules: {
		// Enforce conventional commit types
		"type-enum": [
			2,
			"always",
			[
				"feat",
				"fix",
				"docs",
				"style",
				"refactor",
				"test",
				"chore",
				"perf",
				"ci",
				"build",
				"revert",
			],
		],
		// Allow longer subjects for descriptive commits
		"subject-max-length": [1, "always", 100],
		// Don't require scope
		"scope-empty": [0],
	},
};
