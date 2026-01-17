# MCP Servers

## Overview

OmniDev supports [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) servers as first-class capabilities. Define MCP servers directly in your `omni.toml` and they automatically become capabilities you can enable in profiles.

## Defining MCP Servers

Add MCP servers under the `[mcps]` section:

```toml
[mcps.filesystem]
command = "npx"
args = ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/dir"]
transport = "stdio"

[mcps.github]
command = "npx"
args = ["-y", "@modelcontextprotocol/server-github"]
[mcps.github.env]
GITHUB_TOKEN = "${GITHUB_TOKEN}"
```

### Configuration Options

| Field | Required | Description |
|-------|----------|-------------|
| `command` | Yes | Executable to run |
| `args` | No | Command arguments |
| `transport` | No | `stdio` (default), `sse`, or `http` |
| `cwd` | No | Working directory |
| `env` | No | Environment variables |

## Using in Profiles

Reference MCPs by name in your profile's capabilities:

```toml
[mcps.context7]
command = "npx"
args = ["-y", "@upstash/context7-mcp"]

[profiles.default]
capabilities = ["context7"]

[profiles.full]
capabilities = ["context7", "filesystem", "github"]
```

## How It Works

When you define `[mcps.name]`, OmniDev:

1. Generates a synthetic capability in `.omni/capabilities/name/`
2. Creates a `capability.toml` with `generated_from_omni_toml = true` metadata
3. Registers the MCP server configuration for `.mcp.json` sync

The generated capability is automatically cleaned up when removed from config.

## Environment Variables

Use `${VAR}` syntax for secrets that should come from environment:

```toml
[mcps.database]
command = "node"
args = ["./mcp-server.js"]
[mcps.database.env]
DB_URL = "${DATABASE_URL}"
API_KEY = "${API_KEY}"
```

Define these in `.omni/.env` (gitignored) or your shell environment.

## Example: Full Configuration

```toml
# omni.toml

[mcps.filesystem]
command = "npx"
args = ["-y", "@modelcontextprotocol/server-filesystem", "./data"]
transport = "stdio"

[mcps.postgres]
command = "npx"
args = ["-y", "@modelcontextprotocol/server-postgres"]
[mcps.postgres.env]
POSTGRES_URL = "${DATABASE_URL}"

[profiles.default]
capabilities = ["filesystem"]

[profiles.database]
capabilities = ["filesystem", "postgres"]
```

