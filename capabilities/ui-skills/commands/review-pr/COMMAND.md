---
name: review-pr
description: Review a pull request with detailed feedback
allowed-tools: Bash(gh pr view:*), Bash(gh pr diff:*), Bash(git diff:*)
---

Review Pull Request #$1 with priority $2.

## Context

- PR Number: #$1
- Priority: $2
- PR Details: !`gh pr view $1`
- PR Diff: !`gh pr diff $1`

## Review Checklist

### Critical Issues (Must Fix)
- [ ] Security vulnerabilities
- [ ] Data loss risks
- [ ] Breaking changes without migration path
- [ ] Exposed secrets or credentials

### Code Quality (Should Fix)
- [ ] Code clarity and readability
- [ ] Proper error handling
- [ ] Input validation
- [ ] Test coverage
- [ ] Documentation

### Performance (Consider)
- [ ] Algorithmic efficiency
- [ ] Database query optimization
- [ ] Memory usage
- [ ] Network calls

## Output Format

Provide your review as:

1. **Summary**: Brief overview of the changes
2. **Critical Issues**: Issues that must be fixed before merging
3. **Warnings**: Issues that should be addressed
4. **Suggestions**: Nice-to-have improvements
5. **Approval Status**: Approve / Request Changes / Comment

Include specific file locations and code snippets for all feedback.
