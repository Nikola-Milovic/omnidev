---
name: fix-issue
description: Fix a GitHub issue following project coding standards
allowed-tools: Bash(git add:*), Bash(git status:*), Bash(git commit:*)
---

Fix issue #$ARGUMENTS following the project's coding standards.

## Context

- Issue number: #$ARGUMENTS
- Current branch: !`git branch --show-current`
- Current status: !`git status`

## Your Task

1. Review the issue details (use GitHub API or gh CLI if available)
2. Implement the fix with proper error handling
3. Write tests for the fix
4. Run existing tests to ensure nothing breaks
5. Create a descriptive commit message

## Commit Format

```
fix: <brief description> (#$ARGUMENTS)

<detailed explanation of the fix>

Closes #$ARGUMENTS
```

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
