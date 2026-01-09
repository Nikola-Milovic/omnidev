#!/usr/bin/env bash
# Ralph - Long-running AI agent orchestrator
# Usage: ./ralph.sh [max_iterations] [agent]
#
# Executes PRD-driven development through iterative AI agent invocations.
# Each iteration works on one user story from prd.json.

set -e

MAX_ITERATIONS=${1:-10}
AGENT=${2:-claude}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PRD_FILE="$SCRIPT_DIR/prd.json"
PROGRESS_FILE="$SCRIPT_DIR/progress.txt"
ARCHIVE_DIR="$SCRIPT_DIR/archive"
LAST_BRANCH_FILE="$SCRIPT_DIR/.last-branch"

# Check for jq dependency
if ! command -v jq &> /dev/null; then
  echo "❌ jq is required but not installed."
  echo "   Install it with: brew install jq (macOS) or apt install jq (Linux)"
  exit 1
fi

# Archive previous run if branch changed
if [ -f "$PRD_FILE" ] && [ -f "$LAST_BRANCH_FILE" ]; then
  CURRENT_BRANCH=$(jq -r '.branchName // empty' "$PRD_FILE" || echo "")
  LAST_BRANCH=$(cat "$LAST_BRANCH_FILE" 2>/dev/null || echo "")

  if [ -n "$CURRENT_BRANCH" ] && [ -n "$LAST_BRANCH" ] && [ "$CURRENT_BRANCH" != "$LAST_BRANCH" ]; then
    # Archive the previous run
    DATE=$(date +%Y-%m-%d)
    # Strip "ralph/" prefix from branch name for folder
    FOLDER_NAME=$(echo "$LAST_BRANCH" | sed 's|^ralph/||')
    ARCHIVE_FOLDER="$ARCHIVE_DIR/$DATE-$FOLDER_NAME"

    echo "📦 Archiving previous run: $LAST_BRANCH"
    mkdir -p "$ARCHIVE_FOLDER"
    [ -f "$PRD_FILE" ] && cp "$PRD_FILE" "$ARCHIVE_FOLDER/"
    [ -f "$PROGRESS_FILE" ] && cp "$PROGRESS_FILE" "$ARCHIVE_FOLDER/"
    echo "   Archived to: $ARCHIVE_FOLDER"

    # Reset progress file for new run
    echo "# Ralph Progress Log" > "$PROGRESS_FILE"
    echo "Started: $(date)" >> "$PROGRESS_FILE"
    echo "---" >> "$PROGRESS_FILE"
  fi
fi

# Track current branch
if [ -f "$PRD_FILE" ]; then
  CURRENT_BRANCH=$(jq -r '.branchName // empty' "$PRD_FILE" || echo "")
  if [ -n "$CURRENT_BRANCH" ]; then
    echo "$CURRENT_BRANCH" > "$LAST_BRANCH_FILE"
  fi
fi

# Initialize progress file if it doesn't exist
if [ ! -f "$PROGRESS_FILE" ]; then
  echo "# Ralph Progress Log" > "$PROGRESS_FILE"
  echo "Started: $(date)" >> "$PROGRESS_FILE"
  echo "---" >> "$PROGRESS_FILE"
fi

# Check PRD exists
if [ ! -f "$PRD_FILE" ]; then
  echo "❌ No prd.json found at $PRD_FILE"
  echo "   Create one using the 'ralph' skill or manually."
  exit 1
fi

# Check for remaining stories
REMAINING=$(jq '[.userStories[] | select(.passes == false)] | length' "$PRD_FILE")
if [ -z "$REMAINING" ] || [ "$REMAINING" -eq 0 ]; then
  echo "✅ All user stories are complete!"
  exit 0
fi

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║  🤖 Ralph Agent Orchestrator                               ║"
echo "╠════════════════════════════════════════════════════════════╣"
echo "║  Agent:      $AGENT"
echo "║  Iterations: $MAX_ITERATIONS"
echo "║  Remaining:  $REMAINING stories"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

run_agent() {
  local prompt_file="$1"

  case "$AGENT" in
    amp)
      cat "$prompt_file" | amp --dangerously-allow-all 2>&1 | tee /dev/stderr
      ;;
    codex)
      if command -v setsid >/dev/null 2>&1; then
        setsid npx -y @openai/codex exec \
          -c shell_environment_policy.inherit=all \
          --dangerously-bypass-approvals-and-sandbox - < "$prompt_file"
      else
        npx -y @openai/codex exec \
          -c shell_environment_policy.inherit=all \
          --dangerously-bypass-approvals-and-sandbox - < "$prompt_file"
      fi
      ;;
    claude)
      npx -y @anthropic-ai/claude-code --model sonnet --dangerously-skip-permissions -p "$(cat "$prompt_file")" 2>&1 | tee /dev/stderr
      ;;
    *)
      echo "❌ Unsupported agent: $AGENT"
      echo "   Supported agents: amp, codex, claude"
      exit 1
      ;;
  esac
}

for i in $(seq 1 $MAX_ITERATIONS); do
  # Check remaining stories
  REMAINING=$(jq '[.userStories[] | select(.passes == false)] | length' "$PRD_FILE")
  if [ -z "$REMAINING" ] || [ "$REMAINING" -eq 0 ]; then
    echo ""
    echo "✅ All user stories complete!"
    echo "   Finished at iteration $i of $MAX_ITERATIONS"
    exit 0
  fi

  NEXT_STORY=$(jq -r '[.userStories[] | select(.passes == false)] | sort_by(.priority) | .[0].id // empty' "$PRD_FILE")

  echo ""
  echo "═══════════════════════════════════════════════════════════"
  echo "  📍 Ralph Iteration $i of $MAX_ITERATIONS"
  echo "  📋 Next story: $NEXT_STORY ($REMAINING remaining)"
  echo "═══════════════════════════════════════════════════════════"

  # Run agent with the prompt
  OUTPUT=$(run_agent "$SCRIPT_DIR/prompt.md") || true

  # Check for completion signal
  if echo "$OUTPUT" | grep -q "<promise>COMPLETE</promise>"; then
    echo ""
    echo "🎉 Ralph completed all tasks!"
    echo "   Finished at iteration $i of $MAX_ITERATIONS"
    exit 0
  fi

  echo ""
  echo "   Iteration $i complete. Continuing..."
  sleep 2
done

echo ""
echo "⏹ Ralph reached max iterations ($MAX_ITERATIONS)."
echo "  Check $PROGRESS_FILE for status."
exit 1

