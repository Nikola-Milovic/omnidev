#!/usr/bin/env bash
# Test: Doctor command
# Validates: Doctor runs and reports status

set -euo pipefail

# Source helpers
# shellcheck source=../inside/helpers.sh
source "${HELPERS_PATH}"

# Setup
setup_testdir "doctor-"

info "Creating standard fixture omni.toml..."
create_standard_fixture_toml

info "Running init with claude-code provider..."
run_omnidev init claude-code

info "Syncing..."
run_omnidev sync

info "Running doctor..."
doctor_output=$(run_omnidev doctor)

info "Validating doctor output..."
# Doctor should complete without error and show status
assert_contains "$doctor_output" "Configuration"

info "Doctor output:"
echo "$doctor_output"

success "06-doctor completed successfully"
