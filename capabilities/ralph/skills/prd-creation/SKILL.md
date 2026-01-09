---
name: prd
description: "Generate a Product Requirements Document (PRD) for a new feature. Triggers on: create a prd, write prd for, plan this feature, requirements for, spec out."
---

# PRD Generator

Create detailed, structured PRDs for Ralph orchestration to enable AI-driven development.

## The Job

When a user requests a PRD:

1. **Understand the Feature**: Ask 3-5 clarifying questions about:
   - Target users and use cases
   - Key functionality and features
   - Technical constraints or requirements
   - Success criteria and acceptance tests
   - Timeline expectations (if any)

2. **Generate Structured PRD**: Create a `prd.json` file with:
   - `project`: Project name
   - `branchName`: Git branch for development (e.g., `feature/my-feature`)
   - `description`: Brief overview of the feature
   - `userStories`: Array of user stories with:
     - `id`: Unique identifier (US-001, US-002, etc.)
     - `title`: Short descriptive title
     - `taskFile`: Path to detailed spec file
     - `scope`: Specific part of task to implement in this story
     - `acceptanceCriteria`: Array of verifiable criteria
     - `priority`: Execution order (lower number = higher priority)
     - `passes`: Boolean (initially false)
     - `notes`: Optional context

3. **Create Spec Files**: For each user story, create a detailed spec file at `.omni/ralph/prds/<prd-name>/specs/XXX-feature.md` containing:
   - **Introduction**: What needs to be done and why
   - **Goals**: What we're trying to achieve
   - **User Stories**: Detailed acceptance criteria
   - **Functional Requirements**: Specific behaviors and edge cases
   - **Technical Considerations**: Code examples, patterns, architecture notes
   - **Touchpoints**: Files to create or modify
   - **Dependencies**: What must exist before this can be implemented

4. **Save Everything**:
   - Save `prd.json` to `.omni/ralph/prds/<prd-name>/prd.json`
   - Create `progress.txt` with initial structure:
     ```
     ## Codebase Patterns

     ---

     ## Progress Log

     Started: [Date]
     ```
   - Create all spec files in `specs/` directory

5. **Set as Active**: Run `omnidev ralph prd select <prd-name>` to make it active

## PRD Structure Best Practices

- **Break Down Large Features**: Split into multiple user stories (5-10 stories is typical)
- **Order by Dependency**: Lower priority numbers should be foundational work
- **Scope Appropriately**: Each story should be completable in one agent iteration
- **Link to Specs**: Every story must have a `taskFile` with detailed requirements
- **Verifiable Criteria**: Acceptance criteria should be objective and testable

## Example User Story

```json
{
  "id": "US-001",
  "title": "Set up authentication database schema",
  "taskFile": "specs/001-auth-schema.md",
  "scope": "Database schema only (users, sessions tables)",
  "acceptanceCriteria": [
    "Users table created with email, password_hash, created_at",
    "Sessions table created with user_id, token, expires_at",
    "Foreign key constraint from sessions.user_id to users.id",
    "Indexes added for email and token lookups",
    "Migration file created and tested"
  ],
  "priority": 1,
  "passes": false,
  "notes": ""
}
```

## Quality Checks

Before finalizing the PRD:

- All stories have unique IDs in sequence (US-001, US-002, etc.)
- All stories link to spec files that exist
- Priorities are ordered correctly (no gaps, no duplicates)
- Acceptance criteria are specific and verifiable
- Scope fields clearly define boundaries for each story

## Tips for Success

- **Start Simple**: First story should be scaffolding or setup
- **Build Incrementally**: Each story should build on previous ones
- **Test at Milestones**: Include testing stories every 5-10 implementation stories
- **Document Patterns**: Encourage agents to document reusable patterns in progress.txt
- **Keep Specs Detailed**: Agents work better with clear, detailed specifications
