---
"@omnidev-ai/cli": minor
"@omnidev-ai/core": minor
---

Add `omnidev add cap` and `omnidev add mcp` commands for easily adding capabilities and MCP servers to omni.toml

- `omnidev add cap <name> --github <user/repo> [--path <path>]` - Add a capability source from GitHub
- `omnidev add mcp <name> --transport http --url <url>` - Add an HTTP/SSE MCP server
- `omnidev add mcp <name> --command <cmd> --args "<args>"` - Add a stdio MCP server

Also fixes `capability enable/disable` commands to properly preserve existing omni.toml content (sources, mcps, always_enabled_capabilities) instead of overwriting with commented examples.
