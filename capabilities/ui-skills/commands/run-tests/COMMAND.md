---
name: run-tests
description: Run tests and provide detailed results
allowed-tools: Bash(npm test:*), Bash(bun test:*), Bash(pytest:*), Bash(go test:*), Bash(cargo test:*)
---

Run tests and provide a detailed report.

## Test Framework Detection

Detect the test framework by checking:
- `package.json` for npm/bun (jest, vitest, mocha)
- `pytest.ini` or `pyproject.toml` for pytest
- `go.mod` for Go tests
- `Cargo.toml` for Rust tests

## Execution

Run the appropriate test command:
- Node.js: `npm test` or `bun test`
- Python: `pytest`
- Go: `go test ./...`
- Rust: `cargo test`

## Report Format

### Summary
- Total tests: X
- Passed: X (✓)
- Failed: X (✗)
- Skipped: X (-)
- Duration: Xs

### Failed Tests
For each failure:
```
Test: [test name]
File: [file:line]
Expected: [expected value]
Actual: [actual value]
Error: [error message]

Suggested fix: [if obvious]
```

### Performance Warnings
- Flag tests slower than 1s for unit tests
- Flag tests slower than 5s for integration tests

### Next Steps
- If all tests pass: "All tests passing ✓"
- If tests fail: List specific failures and suggest fixes
