#!/usr/bin/env bash
# Test: Profile creation and switching
# Validates: Profile list shows profiles, switching works

set -euo pipefail

# Source helpers
# shellcheck source=../inside/helpers.sh
source "${HELPERS_PATH}"

# Setup
setup_testdir "profile-switch-"

info "Creating multi-profile omni.toml..."
create_multi_profile_toml

info "Running init with claude-code provider..."
run_omnidev init claude-code

info "Listing profiles..."
profile_output=$(run_omnidev profile list)
assert_contains "$profile_output" "default"
assert_contains "$profile_output" "work"

info "Syncing with default profile..."
run_omnidev sync

info "Validating default profile capabilities..."
assert_capability_synced "standard"

info "Switching to work profile..."
run_omnidev profile set work

info "Verifying work profile is active..."
profile_output=$(run_omnidev profile list)
assert_contains "$profile_output" "work"
assert_contains "$profile_output" "(active)"

info "Syncing with work profile..."
run_omnidev sync

info "Validating work profile capabilities..."
assert_capability_synced "standard"
assert_capability_synced "claude-plugin"

info "Switching back to default profile..."
run_omnidev profile set default

info "Syncing..."
run_omnidev sync

success "04-profile-switching completed successfully"
