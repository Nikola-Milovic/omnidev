#!/usr/bin/env bash
# Worktree setup script
# Called by Worktrunk's post-create hook
# Copies environment files from main worktree and installs dependencies

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() { echo -e "${BLUE}[INFO]${NC} $*"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $*"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $*"; }
log_error() { echo -e "${RED}[ERROR]${NC} $*" >&2; }

# Get branch name from argument or current git branch
BRANCH="${1:-$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo 'main')}"

log_info "Setting up worktree for branch: $BRANCH"

# Get the main worktree path (first entry in git worktree list)
get_main_worktree() {
    git worktree list --porcelain | grep "^worktree " | head -1 | cut -d' ' -f2-
}

# Copy .env files from the main worktree
# Copies actual .env and .env.development files (not examples)
copy_env_files() {
    log_info "Copying environment files from main worktree..."

    local main_worktree
    main_worktree=$(get_main_worktree)

    if [ -z "$main_worktree" ]; then
        log_warn "Could not determine main worktree, skipping env file copy"
        return 0
    fi

    # Don't copy if we ARE the main worktree
    if [ "$main_worktree" = "$REPO_ROOT" ]; then
        log_info "This is the main worktree, skipping env file copy"
        return 0
    fi

    log_info "Main worktree: $main_worktree"

    local copied=0
    local skipped=0

    # Find all .env and .env.* files (but not .env.example or .env.*.example)
    while IFS= read -r -d '' env_file; do
        # Skip example files
        if [[ "$env_file" == *.example ]]; then
            continue
        fi

        # Get relative path from main worktree
        local rel_path="${env_file#$main_worktree/}"
        local dest="$REPO_ROOT/$rel_path"

        # Skip if destination already exists
        if [ -f "$dest" ]; then
            log_info "Skipping $rel_path (already exists)"
            skipped=$((skipped + 1))
            continue
        fi

        # Create destination directory if needed
        mkdir -p "$(dirname "$dest")"

        cp "$env_file" "$dest"
        log_success "Copied $rel_path"
        copied=$((copied + 1))
    done < <(find "$main_worktree" -name ".env" -o -name ".env.*" 2>/dev/null | grep -v node_modules | tr '\n' '\0')

    log_info "Copied $copied env files, skipped $skipped existing"
}

# Install dependencies
install_dependencies() {
    log_info "Installing dependencies with pnpm..."

    cd "$REPO_ROOT"

    if command -v pnpm &> /dev/null; then
        pnpm install --frozen-lockfile 2>/dev/null || pnpm install
        log_success "Dependencies installed"
    else
        log_warn "pnpm not found, skipping dependency installation"
        log_warn "Run 'pnpm install' manually after activating your environment"
    fi
}

# Print summary
print_summary() {
    echo ""
    echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}  Worktree setup complete!${NC}"
    echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
    echo ""
    echo -e "Branch: ${BLUE}$BRANCH${NC}"
    echo ""
    echo -e "${YELLOW}Quick Start:${NC}"
    echo "  1. Start Docker services:  just d up -d"
    echo "  2. Run migrations:         just db-migrate"
    echo "  3. Seed database:          just db-seed"
    echo "  4. Start dev servers:      pnpm dev"
    echo ""
    echo -e "${YELLOW}Or run full setup:${NC}  just setup"
    echo ""
    echo -e "${YELLOW}Tip:${NC} Add this alias to your shell for devbox shorthand:"
    echo "  alias dv='devbox run'"
    echo ""
}

# Main execution
main() {
    copy_env_files
    install_dependencies
    print_summary
}

main "$@"
