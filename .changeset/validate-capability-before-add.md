---
"@omnidev-ai/cli": patch
"@omnidev-ai/core": patch
---

Validate GitHub repository before adding to omni.toml

The `add cap` command now validates that a GitHub repository exists and is a valid capability before writing to omni.toml. This prevents adding invalid or non-existent repositories to the configuration.

Validation checks:
- Repository exists and is accessible
- Repository contains capability.toml OR can be auto-wrapped (has skills, agents, commands, rules, docs, or .claude-plugin)

If validation fails, the command exits with an appropriate error message without modifying omni.toml.
