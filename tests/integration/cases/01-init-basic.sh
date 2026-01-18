#!/usr/bin/env bash
# Test: Basic init and sync with standard fixture
# Validates: .omni/ structure, capability synced, fixture markers present

set -euo pipefail

# Source helpers
# shellcheck source=../inside/helpers.sh
source "${HELPERS_PATH}"

# Setup
setup_testdir "init-basic-"

info "Creating omni.toml with standard fixture..."
create_standard_fixture_toml

info "Running init with claude-code provider..."
run_omnidev init claude-code

info "Running sync..."
run_omnidev sync

info "Validating .omni/ structure..."
assert_omni_structure

info "Validating capability synced..."
assert_capability_synced "standard"

info "Validating CLAUDE.md exists..."
assert_claude_md_exists

info "Validating fixture markers..."
assert_marker_synced "FIXTURE_MARKER:STANDARD_SKILL"
assert_marker_synced "FIXTURE_MARKER:STANDARD_RULE"

success "01-init-basic completed successfully"
