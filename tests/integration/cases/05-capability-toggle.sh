#!/usr/bin/env bash
# Test: Capability enable/disable
# Validates: Capabilities can be toggled on/off

set -euo pipefail

# Source helpers
# shellcheck source=../inside/helpers.sh
source "${HELPERS_PATH}"

# Setup
setup_testdir "cap-toggle-"

info "Creating multi-profile omni.toml..."
create_multi_profile_toml

info "Running init with claude-code provider..."
run_omnidev init claude-code

info "Syncing..."
run_omnidev sync

info "Validating initial state..."
assert_capability_synced "standard"

info "Listing capabilities..."
cap_output=$(run_omnidev capability list)
assert_contains "$cap_output" "standard"

info "Disabling capability..."
run_omnidev capability disable standard

info "Verifying capability disabled..."
cap_output=$(run_omnidev capability list)
assert_contains "$cap_output" "disabled"

info "Re-enabling capability..."
run_omnidev capability enable standard

info "Verifying capability enabled..."
cap_output=$(run_omnidev capability list)
assert_contains "$cap_output" "enabled"

info "Syncing to apply changes..."
run_omnidev sync

success "05-capability-toggle completed successfully"
