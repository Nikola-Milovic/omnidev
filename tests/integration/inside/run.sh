#!/usr/bin/env bash
# Integration test case runner for OmniDev
# Discovers and runs all test cases in tests/integration/cases/

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
NC='\033[0m'

# Configuration from environment
MODE="${IT_MODE:-dev}"
RUNNER="${IT_RUNNER:-local}"
CLI_VERSION="${IT_CLI_VERSION:-}"
RUNTIME="${IT_RUNTIME:-bun}"

REPO_ROOT="${REPO_ROOT:-$(pwd)}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CASES_DIR="${REPO_ROOT}/tests/integration/cases"

# Export helpers path for case scripts
export HELPERS_PATH="${SCRIPT_DIR}/helpers.sh"

# Temp bun tracking (for node container)
TEMP_BUN_DIR=""

# ============================================================================
# Utility Functions
# ============================================================================

log_info() {
  echo -e "${CYAN}$1${NC}"
}

log_success() {
  echo -e "${GREEN}$1${NC}"
}

log_error() {
  echo -e "${RED}$1${NC}" >&2
}

log_warn() {
  echo -e "${YELLOW}$1${NC}"
}

# ============================================================================
# Build Functions
# ============================================================================

install_temp_bun() {
  log_info "Installing temporary Bun for build..."

  TEMP_BUN_DIR="$(mktemp -d "/tmp/omnidev-bun-XXXXXX")"

  if ! BUN_INSTALL="${TEMP_BUN_DIR}" bash -lc "curl -fsSL https://bun.sh/install | bash" > /dev/null 2>&1; then
    log_error "Failed to install temporary Bun"
    exit 1
  fi

  export BUN_INSTALL="${TEMP_BUN_DIR}"
  export PATH="${TEMP_BUN_DIR}/bin:${PATH}"

  if ! "${TEMP_BUN_DIR}/bin/bun" --version > /dev/null 2>&1; then
    log_error "Bun installation verification failed"
    exit 1
  fi

  log_info "Temporary Bun installed: $("${TEMP_BUN_DIR}/bin/bun" --version)"
}

remove_temp_bun() {
  if [[ -n "$TEMP_BUN_DIR" && -d "$TEMP_BUN_DIR" ]]; then
    log_info "Removing temporary Bun..."
    rm -rf "$TEMP_BUN_DIR"
    TEMP_BUN_DIR=""

    # Remove from PATH
    export PATH="${PATH#${TEMP_BUN_DIR}/bin:}"
  fi
}

build_project() {
  local bun_cmd="$1"

  log_info "Installing dependencies..."
  if ! "$bun_cmd" install --frozen-lockfile --ignore-scripts > /dev/null 2>&1; then
    log_error "Failed to install dependencies"
    exit 1
  fi

  log_info "Building project..."
  if ! "$bun_cmd" run build > /dev/null 2>&1; then
    log_error "Failed to build project"
    exit 1
  fi
}

# ============================================================================
# CLI Invocation Setup
# ============================================================================

setup_omnidev_command() {
  local cli_path="${REPO_ROOT}/packages/cli/dist/index.js"

  case "$RUNNER" in
    local)
      # Bun container, running local build
      build_project "bun"
      export OMNIDEV="bun ${cli_path}"
      ;;

    local-node)
      # Node container, need temp bun for build
      install_temp_bun
      build_project "${TEMP_BUN_DIR}/bin/bun"
      remove_temp_bun
      export OMNIDEV="node ${cli_path}"
      ;;

    npx)
      # Use npx to run published CLI
      if [[ -z "$CLI_VERSION" ]]; then
        log_error "IT_CLI_VERSION required for runner=npx"
        exit 1
      fi
      export OMNIDEV="npx -y @omnidev-ai/cli@${CLI_VERSION}"
      ;;

    bunx)
      # Use bunx to run published CLI
      if [[ -z "$CLI_VERSION" ]]; then
        log_error "IT_CLI_VERSION required for runner=bunx"
        exit 1
      fi
      export OMNIDEV="bunx @omnidev-ai/cli@${CLI_VERSION}"
      ;;

    *)
      log_error "Unknown runner: $RUNNER"
      exit 1
      ;;
  esac
}

# ============================================================================
# Test Execution
# ============================================================================

run_case() {
  local case_file="$1"
  local case_name
  case_name="$(basename "$case_file" .sh)"

  echo ""
  log_info "==> Running: $case_name"

  # Run the case in a subshell to isolate environment
  if bash "$case_file"; then
    log_success "PASS: $case_name"
    return 0
  else
    log_error "FAIL: $case_name"
    return 1
  fi
}

discover_cases() {
  if [[ ! -d "$CASES_DIR" ]]; then
    log_error "Cases directory not found: $CASES_DIR"
    exit 1
  fi

  # Find all .sh files in cases directory, sorted
  find "$CASES_DIR" -maxdepth 1 -name "*.sh" -type f | sort
}

# ============================================================================
# Main
# ============================================================================

main() {
  echo "OmniDev Integration Tests (Bash Runner)"
  echo "========================================"
  echo "  Mode:    $MODE"
  echo "  Runner:  $RUNNER"
  echo "  Runtime: $RUNTIME"
  if [[ -n "$CLI_VERSION" ]]; then
    echo "  Version: $CLI_VERSION"
  fi
  echo ""

  # Validate mode
  if [[ "$MODE" == "release" && -z "$CLI_VERSION" ]]; then
    log_error "IT_CLI_VERSION required for IT_MODE=release"
    exit 1
  fi

  # Setup CLI command
  setup_omnidev_command

  log_info "OMNIDEV=$OMNIDEV"
  echo ""

  # Discover test cases
  log_info "Looking for test cases in: $CASES_DIR"
  local cases
  cases="$(discover_cases)"

  if [[ -z "$cases" ]]; then
    log_error "No test cases found in $CASES_DIR"
    exit 1
  fi

  local case_count
  case_count=$(echo "$cases" | wc -l)
  log_info "Found $case_count test cases"

  local total=0
  local passed=0
  local failed=0
  local failed_cases=()

  # Run each case
  while IFS= read -r case_file; do
    total=$((total + 1))
    if run_case "$case_file"; then
      passed=$((passed + 1))
    else
      failed=$((failed + 1))
      failed_cases+=("$(basename "$case_file" .sh)")
    fi
  done <<< "$cases"

  # Summary
  echo ""
  echo "========================================"
  echo "Results: $passed/$total passed"

  if [[ $failed -gt 0 ]]; then
    log_error "Failed cases:"
    for case_name in "${failed_cases[@]}"; do
      echo "  - $case_name"
    done
    exit 1
  else
    log_success "All integration tests passed!"
  fi
}

main "$@"
