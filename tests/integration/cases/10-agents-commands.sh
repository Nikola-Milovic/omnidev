#!/usr/bin/env bash
# Test: Agents and commands sync for Claude Code and OpenCode
# Validates: subagents -> .claude/agents/, commands -> .claude/skills/ (claude)
#            subagents -> .opencode/agents/, commands -> .opencode/commands/ (opencode)

set -euo pipefail

# Source helpers
# shellcheck source=../inside/helpers.sh
source "${HELPERS_PATH}"

# Setup
setup_testdir "agents-commands-"

info "Creating omni.toml with standard fixture..."
create_standard_fixture_toml

# ============================================================================
# Test 1: Claude Code provider
# ============================================================================
info "Testing Claude Code provider..."

run_omnidev init claude-code
run_omnidev sync

info "Validating .omni/ structure..."
assert_omni_structure

info "Validating CLAUDE.md exists..."
assert_claude_md_exists

info "Validating subagent synced to .claude/agents/..."
assert_file_exists ".claude/agents/code-reviewer.md"
assert_file_contains ".claude/agents/code-reviewer.md" "name: code-reviewer"
assert_file_contains ".claude/agents/code-reviewer.md" "description: \"Reviews code for quality and best practices\""
assert_file_contains ".claude/agents/code-reviewer.md" "tools: Read, Glob, Grep"
assert_file_contains ".claude/agents/code-reviewer.md" "model: sonnet"
assert_file_contains ".claude/agents/code-reviewer.md" "permissionMode: acceptEdits"
assert_file_contains ".claude/agents/code-reviewer.md" "FIXTURE_MARKER:STANDARD_SUBAGENT"

info "Validating command synced as skill to .claude/skills/..."
assert_file_exists ".claude/skills/review-pr/SKILL.md"
assert_file_contains ".claude/skills/review-pr/SKILL.md" "name: review-pr"
assert_file_contains ".claude/skills/review-pr/SKILL.md" "description: \"Review a pull request for issues and improvements\""
assert_file_contains ".claude/skills/review-pr/SKILL.md" "allowed_tools:"
assert_file_contains ".claude/skills/review-pr/SKILL.md" "FIXTURE_MARKER:STANDARD_COMMAND"

success "Claude Code agents and commands test passed"

# ============================================================================
# Test 2: OpenCode provider
# ============================================================================
info "Testing OpenCode provider..."

# Clean up Claude Code files and reinit with OpenCode
rm -rf .claude CLAUDE.md

run_omnidev provider enable opencode
run_omnidev provider disable claude-code
run_omnidev sync

info "Validating AGENTS.md exists..."
assert_file_exists "AGENTS.md"

info "Validating subagent synced to .opencode/agents/..."
assert_file_exists ".opencode/agents/code-reviewer.md"
assert_file_contains ".opencode/agents/code-reviewer.md" "description: \"Reviews code for quality and best practices\""
# OpenCode maps 'sonnet' to full model ID
assert_file_contains ".opencode/agents/code-reviewer.md" "model: anthropic/claude-sonnet-4"
# OpenCode uses object format for tools
assert_file_contains ".opencode/agents/code-reviewer.md" "tools:"
assert_file_contains ".opencode/agents/code-reviewer.md" "read: true"
assert_file_contains ".opencode/agents/code-reviewer.md" "glob: true"
assert_file_contains ".opencode/agents/code-reviewer.md" "grep: true"
# OpenCode maps permission modes
assert_file_contains ".opencode/agents/code-reviewer.md" "permissions:"
assert_file_contains ".opencode/agents/code-reviewer.md" "edit: allow"
assert_file_contains ".opencode/agents/code-reviewer.md" "FIXTURE_MARKER:STANDARD_SUBAGENT"

info "Validating command synced to .opencode/commands/..."
assert_file_exists ".opencode/commands/review-pr.md"
assert_file_contains ".opencode/commands/review-pr.md" "description: \"Review a pull request for issues and improvements\""
assert_file_contains ".opencode/commands/review-pr.md" "FIXTURE_MARKER:STANDARD_COMMAND"

success "OpenCode agents and commands test passed"

# ============================================================================
# Test 3: Both providers enabled
# ============================================================================
info "Testing both providers enabled..."

run_omnidev provider enable claude-code
run_omnidev sync

info "Validating both CLAUDE.md and AGENTS.md exist..."
assert_file_exists "CLAUDE.md"
assert_file_exists "AGENTS.md"

info "Validating Claude Code agents..."
assert_file_exists ".claude/agents/code-reviewer.md"
assert_file_contains ".claude/agents/code-reviewer.md" "FIXTURE_MARKER:STANDARD_SUBAGENT"

info "Validating OpenCode agents..."
assert_file_exists ".opencode/agents/code-reviewer.md"
assert_file_contains ".opencode/agents/code-reviewer.md" "FIXTURE_MARKER:STANDARD_SUBAGENT"

info "Validating Claude Code commands as skills..."
assert_file_exists ".claude/skills/review-pr/SKILL.md"
assert_file_contains ".claude/skills/review-pr/SKILL.md" "FIXTURE_MARKER:STANDARD_COMMAND"

info "Validating OpenCode commands..."
assert_file_exists ".opencode/commands/review-pr.md"
assert_file_contains ".opencode/commands/review-pr.md" "FIXTURE_MARKER:STANDARD_COMMAND"

success "10-agents-commands completed successfully"
