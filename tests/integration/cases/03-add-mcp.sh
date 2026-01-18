#!/usr/bin/env bash
# Test: Add MCP server via CLI command
# Validates: MCP appears in .mcp.json after add

set -euo pipefail

# Source helpers
# shellcheck source=../inside/helpers.sh
source "${HELPERS_PATH}"

# Setup
setup_testdir "add-mcp-"

info "Creating minimal omni.toml..."
create_minimal_omni_toml

info "Running init with claude-code provider..."
run_omnidev init claude-code

info "Adding stdio MCP server via CLI..."
run_omnidev add mcp test-server --command echo --args "hello"

info "Validating MCP in .mcp.json..."
assert_mcp_in_config "test-server"

info "Adding HTTP MCP server via CLI..."
run_omnidev add mcp remote-server --transport http --url "https://example.com/mcp"

info "Validating HTTP MCP in .mcp.json..."
assert_mcp_in_config "remote-server"

info "Validating both MCPs are in omni.toml..."
assert_file_contains "omni.toml" "test-server"
assert_file_contains "omni.toml" "remote-server"

success "03-add-mcp completed successfully"
