# Ralph - Quick Reference Card

**AI Agent Orchestrator for PRD-Driven Development**

---

## 🚀 Quick Setup

```bash
# One-line setup (if you have the script)
curl -sSL [url-to-setup-script] | bash

# Or manual:
mkdir -p scripts/ralph .agent/skills/{prd,ralph} tasks
# Copy files from RALPH_SETUP_GUIDE.md
chmod +x scripts/ralph/ralph.sh
```

---

## 📋 Workflow (3 Steps)

### 1️⃣ Create PRD
**In Cursor Composer:**
```
Create a PRD for [your feature description]
```
- Agent asks clarifying questions (A/B/C/D options)
- Respond: "1A, 2C, 3B"
- PRD saved to `tasks/prd-XXX-feature.md`

### 2️⃣ Create Orchestration
**In Cursor Composer:**
```
Create ralph prd for tasks/prd-XXX-feature.md
```
- Agent breaks task into user stories
- Creates `scripts/ralph/prd.json`
- Links stories to task file with scopes

### 3️⃣ Run Ralph
**In terminal:**
```bash
./scripts/ralph/ralph.sh 10 amp
# Args: max_iterations (default 10), agent (default amp)
```
- Ralph executes stories one by one
- Commits after each story
- Updates progress log
- Stops when all stories have `passes: true`

---

## 📂 File Structure

```
your-project/
├── scripts/ralph/
│   ├── ralph.sh           ← Orchestrator script
│   ├── prompt.md          ← Agent instructions
│   ├── prd.json           ← Current execution plan
│   ├── progress.txt       ← Progress log + learnings
│   └── archive/           ← Archived runs
├── .agent/skills/
│   ├── prd/SKILL.md       ← PRD generation skill
│   └── ralph/SKILL.md     ← Ralph orchestration skill
└── tasks/
    └── prd-XXX-*.md       ← Detailed task files
```

---

## 🎯 Key Concepts

### prd.json = Orchestration Layer
- Links to detailed task files
- Defines execution order (priority)
- Defines scope for each story
- Tracks progress (passes: true/false)

### Task Files = The Details
- Full requirements and context
- User journeys and UX guidelines
- API contracts and data models
- Acceptance criteria
- Files to modify (touchpoints)

### Story Sizing
✅ **Right size:** Completable in one iteration (10-30 min)
- "Database schema only"
- "API endpoints only"
- "Frontend UI only"

❌ **Wrong size:**
- "Implement entire feature" (too big)
- "Change one variable" (too small)

---

## 🛠️ Commands

```bash
# Run Ralph
./scripts/ralph/ralph.sh 10 amp    # 10 iterations, amp agent
./scripts/ralph/ralph.sh 20 codex  # 20 iterations, codex agent

# Check progress
cat scripts/ralph/progress.txt

# Check remaining stories
jq '.userStories[] | select(.passes == false) | .id + ": " + .title' \
  scripts/ralph/prd.json

# View recent commits
git log --oneline -10

# Manually mark story complete (to skip)
jq '.userStories[0].passes = true' scripts/ralph/prd.json > tmp.json && \
  mv tmp.json scripts/ralph/prd.json
```

---

## 🤖 Agents

| Agent | CLI | Best For |
|-------|-----|----------|
| `amp` | Cursor built-in | Complex tasks, best context |
| `codex` | `npx -y @openai/codex` | Straightforward implementation |
| `claude` | `npx -y @anthropic-ai/claude-code` | Alternative to amp |

---

## 📝 Example prd.json

```json
{
  "project": "MyApp",
  "branchName": "ralph/user-settings",
  "description": "User profile settings feature",
  "userStories": [
    {
      "id": "US-001",
      "title": "Add settings to database",
      "taskFile": "tasks/prd-012-user-settings.md",
      "scope": "Database schema changes only",
      "acceptanceCriteria": [
        "Add settings table with columns",
        "Migration runs successfully",
        "Typecheck passes"
      ],
      "priority": 1,
      "passes": false,
      "notes": ""
    },
    {
      "id": "US-002",
      "title": "Settings API endpoints",
      "taskFile": "tasks/prd-012-user-settings.md",
      "scope": "API only (see API Endpoints section)",
      "acceptanceCriteria": [
        "GET /api/settings returns user settings",
        "PUT /api/settings updates settings",
        "Typecheck passes"
      ],
      "priority": 2,
      "passes": false,
      "notes": ""
    },
    {
      "id": "US-003",
      "title": "Settings UI page",
      "taskFile": "tasks/prd-012-user-settings.md",
      "scope": "Frontend UI (see UX Guidelines)",
      "acceptanceCriteria": [
        "Settings page displays all fields",
        "Save button updates settings",
        "Typecheck passes",
        "Verify in browser"
      ],
      "priority": 3,
      "passes": false,
      "notes": ""
    }
  ]
}
```

---

## 🎓 Progress Log Best Practices

### Structure
```markdown
## Codebase Patterns
- Pattern 1: Use X for Y
- Pattern 2: Always check Z before A

---

## [2026-01-09 10:30] - US-001
- Implemented: Database schema for settings
- Files changed:
  - db/schema.sql
  - src/types.ts
- **Learnings:**
  - Use IF NOT EXISTS for migrations
  - VARCHAR(255) sufficient for user preferences
---
```

### What to Document
✅ **Do document:**
- Reusable patterns
- Gotchas and solutions
- Files changed
- Library-specific quirks

❌ **Don't document:**
- Vague entries ("fixed stuff")
- Obvious things ("added import")
- Copy-paste of commit messages

---

## 🔧 Customization Checklist

When porting to a new project, update:

- [ ] `prompt.md` - project name, commands, docs links
- [ ] Quality check commands (typecheck, lint, format)
- [ ] Dev server command
- [ ] Project-specific patterns section
- [ ] Branch naming convention
- [ ] `prd.example.json` - project name

---

## 🐛 Troubleshooting

| Problem | Solution |
|---------|----------|
| `No prd.json found` | Create using Ralph skill or manually |
| `jq: command not found` | Install: `brew install jq` / `apt install jq` |
| Story too big | Break into smaller scopes in prd.json |
| Agent makes mistakes | Update `## Codebase Patterns` in progress.txt |
| Agent stuck | Add examples to task file, check acceptance criteria |
| Progress log overwritten | Ensure prompt says "APPEND" not "write" |

---

## 📊 Typical Timeline

| Task Size | Stories | Iterations | Time |
|-----------|---------|------------|------|
| Small feature | 2-3 | 5-10 | 20-60 min |
| Medium feature | 5-8 | 10-20 | 1-3 hours |
| Large feature | 10-15 | 20-30 | 3-6 hours |
| Multi-task epic | 15-30 | 30-50 | 6-12 hours |

*Note: Can run Ralph multiple times. It picks up where it left off.*

---

## 🎯 Quality Gates

Ralph enforces these before committing:

```bash
npm run typecheck      # Must pass
npm run lint           # Must pass
npm run format:check   # Must pass
# Browser verification  # For UI stories
```

Customize in `prompt.md` for your project.

---

## 🌟 Pro Tips

1. **Start small** - Test with a simple 2-3 story feature first
2. **Read the progress log** - It contains gold for future iterations
3. **Update patterns early** - First iteration discoveries help all subsequent ones
4. **Don't fear pausing** - Stop Ralph, make manual fixes, continue
5. **Archive is your friend** - Previous runs are saved automatically
6. **Use browser verification** - Always verify UI changes visually
7. **Commit messages matter** - Ralph uses: `feat: [Story ID] - [Story Title]`
8. **Branch per feature** - Use `ralph/feature-name` convention
9. **Monitor progress** - Check `progress.txt` between iterations
10. **Iterate on tasks** - If agent struggles, improve task file clarity

---

## 📚 Full Documentation

For complete setup guide with all code and examples, see:
**RALPH_SETUP_GUIDE.md**

---

## 🤝 Workflow Example

```bash
# Day 1: Plan feature
Cursor> Create a PRD for user authentication system
Agent> [asks questions]
You> 1A, 2C, 3B
# → tasks/prd-005-auth-system.md created

# Day 1: Orchestrate
Cursor> Create ralph prd for tasks/prd-005-auth-system.md
# → scripts/ralph/prd.json created with 8 stories

# Day 1: Execute
./scripts/ralph/ralph.sh 20 amp
# → Ralph completes 5 stories in 2 hours
# → Stories US-001 through US-005 now have passes: true

# Day 2: Resume
./scripts/ralph/ralph.sh 10 amp
# → Ralph picks up at US-006
# → Completes remaining 3 stories
# → All stories complete, feature done!

# Review and merge
git log --oneline
git push origin ralph/auth-system
# Create PR
```

---

**Ralph**: Turning PRDs into Pull Requests, one iteration at a time. 🚀

