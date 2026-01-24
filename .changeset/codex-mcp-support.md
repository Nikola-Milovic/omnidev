---
"@omnidev-ai/adapters": minor
---

Add MCP support for Codex via CodexTomlWriter

- Added `CodexTomlWriter` that writes MCP server configurations to `.codex/config.toml`
- Supports stdio transport (command, args, env, cwd) and http transport (url, http_headers)
- Skips SSE transport with a warning (not supported by Codex)
- OmniDev fully manages the config file and regenerates it on each sync
