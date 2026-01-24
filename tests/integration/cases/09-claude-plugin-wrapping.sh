#!/usr/bin/env bash
# Test: Claude plugin wrapping with hooks.json support
# Validates: Auto-wrapping of .claude-plugin format, hooks.json parsing, path variable resolution

set -euo pipefail

# Source helpers
# shellcheck source=../inside/helpers.sh
source "${HELPERS_PATH}"

# Setup
setup_testdir "claude-plugin-"

info "Creating minimal omni.toml..."
create_minimal_omni_toml

info "Running init with claude-code provider..."
run_omnidev init claude-code

info "Adding Claude plugin capability..."
run_omnidev add cap claude-plugin --github frmlabz/omnidev --path examples/fixtures/claude-plugin

info "Validating omni.toml contains capability source..."
assert_file_contains "omni.toml" "claude-plugin"
assert_file_contains "omni.toml" "frmlabz/omnidev"

info "Validating .omni/ structure..."
assert_omni_structure

info "Validating capability synced with wrapped capability.toml..."
assert_capability_synced "claude-plugin"
assert_file_contains ".omni/capabilities/claude-plugin/capability.toml" "Claude Plugin Fixture"

info "Validating hooks.json processed and paths resolved..."
assert_file_exists ".claude/settings.json"
# Should contain the session-start.js script path
assert_file_contains ".claude/settings.json" "session-start.js"
# Should NOT contain unresolved CLAUDE_PLUGIN_ROOT variable
assert_file_not_contains ".claude/settings.json" "CLAUDE_PLUGIN_ROOT"

info "Validating skill synced..."
assert_marker_synced "FIXTURE_MARKER:CLAUDE_PLUGIN_SKILL"

info "Validating rule in CLAUDE.md..."
assert_file_contains "CLAUDE.md" "FIXTURE_MARKER:CLAUDE_PLUGIN_RULE"

success "09-claude-plugin-wrapping completed successfully"
