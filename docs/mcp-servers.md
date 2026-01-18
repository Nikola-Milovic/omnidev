# MCP Servers

## Overview

OmniDev supports [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) servers as first-class capabilities. Define MCP servers directly in your `omni.toml` and they automatically become capabilities you can enable in profiles.

## Transport Types

OmniDev supports three transport types for MCP servers:

| Transport | Use Case | Required Fields |
|-----------|----------|-----------------|
| `stdio` | Local processes (npm packages, scripts) | `command` |
| `http` | Remote HTTP servers (recommended for cloud) | `url` |
| `sse` | Server-Sent Events (deprecated) | `url` |

## Option 1: stdio Transport (Local Process)

Use `stdio` for MCP servers that run as local processes. This is the default transport and the most common option for community MCP servers.

```toml
# Basic example - stdio is the default
[mcps.filesystem]
command = "npx"
args = ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/dir"]

# Explicit stdio transport
[mcps.github]
command = "npx"
args = ["-y", "@modelcontextprotocol/server-github"]
transport = "stdio"
[mcps.github.env]
GITHUB_TOKEN = "${GITHUB_TOKEN}"

# Custom local server
[mcps.database]
command = "node"
args = ["./servers/database.js"]
cwd = "./mcp-servers"
[mcps.database.env]
DB_URL = "${DATABASE_URL}"
```

### stdio Configuration Options

| Field | Required | Description |
|-------|----------|-------------|
| `command` | Yes | Executable to run |
| `args` | No | Command arguments |
| `transport` | No | `stdio` (default) |
| `cwd` | No | Working directory |
| `env` | No | Environment variables |

## Option 2: http Transport (Remote Server)

Use `http` for connecting to remote MCP servers. This is the recommended transport for cloud-based services.

```toml
# Basic HTTP endpoint
[mcps.notion]
transport = "http"
url = "https://mcp.notion.com/mcp"

# With Bearer token authentication
[mcps.secure-api]
transport = "http"
url = "https://api.example.com/mcp"
[mcps.secure-api.headers]
Authorization = "Bearer ${API_TOKEN}"

# With custom headers
[mcps.internal-api]
transport = "http"
url = "https://internal.company.com/mcp"
[mcps.internal-api.headers]
"X-API-Key" = "${INTERNAL_API_KEY}"
"X-Team-ID" = "engineering"
```

### http Configuration Options

| Field | Required | Description |
|-------|----------|-------------|
| `transport` | Yes | Must be `http` |
| `url` | Yes | Full URL to the MCP endpoint |
| `headers` | No | HTTP headers for authentication |

## Option 3: sse Transport (Deprecated)

The SSE (Server-Sent Events) transport is deprecated. Use `http` transport instead where available.

```toml
# Basic SSE endpoint
[mcps.asana]
transport = "sse"
url = "https://mcp.asana.com/sse"

# With authentication
[mcps.private-api]
transport = "sse"
url = "https://api.company.com/sse"
[mcps.private-api.headers]
"X-API-Key" = "${SSE_API_KEY}"
```

### sse Configuration Options

| Field | Required | Description |
|-------|----------|-------------|
| `transport` | Yes | Must be `sse` |
| `url` | Yes | Full URL to the SSE endpoint |
| `headers` | No | HTTP headers for authentication |

## Using in Profiles

Reference MCPs by name in your profile's capabilities:

```toml
[mcps.context7]
command = "npx"
args = ["-y", "@upstash/context7-mcp"]

[mcps.notion]
transport = "http"
url = "https://mcp.notion.com/mcp"

[profiles.default]
capabilities = ["context7"]

[profiles.full]
capabilities = ["context7", "notion", "filesystem"]
```

## How It Works

When you define `[mcps.name]`, OmniDev:

1. Generates a synthetic capability in `.omni/capabilities/name/`
2. Creates a `capability.toml` with `generated_from_omni_toml = true` metadata
3. Registers the MCP server configuration for `.mcp.json` sync

The generated capability is automatically cleaned up when removed from config.

### Generated .mcp.json Format

OmniDev generates `.mcp.json` in the format expected by Claude Desktop and other MCP clients:

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/dir"]
    },
    "notion": {
      "type": "http",
      "url": "https://mcp.notion.com/mcp"
    },
    "secure-api": {
      "type": "http",
      "url": "https://api.example.com/mcp",
      "headers": {
        "Authorization": "Bearer your-token"
      }
    }
  }
}
```

## Environment Variables

Use `${VAR}` syntax for secrets that should come from environment:

```toml
[mcps.database]
command = "node"
args = ["./mcp-server.js"]
[mcps.database.env]
DB_URL = "${DATABASE_URL}"
API_KEY = "${API_KEY}"

[mcps.remote-api]
transport = "http"
url = "https://api.example.com/mcp"
[mcps.remote-api.headers]
Authorization = "Bearer ${API_TOKEN}"
```

Define these in `.omni/.env` (gitignored) or your shell environment.

## Example: Full Configuration

```toml
# omni.toml

# Local stdio servers
[mcps.filesystem]
command = "npx"
args = ["-y", "@modelcontextprotocol/server-filesystem", "./data"]

[mcps.postgres]
command = "npx"
args = ["-y", "@modelcontextprotocol/server-postgres"]
[mcps.postgres.env]
POSTGRES_URL = "${DATABASE_URL}"

# Remote HTTP server
[mcps.notion]
transport = "http"
url = "https://mcp.notion.com/mcp"

# Remote HTTP server with auth
[mcps.internal-tools]
transport = "http"
url = "https://tools.company.com/mcp"
[mcps.internal-tools.headers]
Authorization = "Bearer ${TOOLS_API_KEY}"

# Profiles
[profiles.default]
capabilities = ["filesystem"]

[profiles.development]
capabilities = ["filesystem", "postgres"]

[profiles.production]
capabilities = ["notion", "internal-tools"]
```
