# Docker Integration Tests

Runs end-to-end CLI flows in clean Ubuntu containers:

- `omnidev init`, `sync`, `add cap`, `add mcp`
- Profile switching and capability toggling
- Doctor command validation
- Validates generated files, synced capabilities, and fixture markers from `examples/`

## Local (dev)

Uses the locally built CLI from this repo:

```bash
bash tests/integration/run.sh dev
```

Equivalent:

```bash
bun run test:integration
```

## Post-publish (release)

Runs against the published package (both `npx` and `bunx`):

```bash
bash tests/integration/run.sh release <version>
```

Example:

```bash
bash tests/integration/run.sh release 1.2.3
```

## Test cases

Test cases are self-contained bash scripts in `tests/integration/cases/`:

| Case | Description |
|------|-------------|
| `01-init-basic.sh` | Init + sync with fixture, validate structure |
| `02-add-capability.sh` | Add cap via CLI, verify omni.toml updated |
| `03-add-mcp.sh` | Add MCP server (stdio & http), verify .mcp.json |
| `04-profile-switching.sh` | Create profiles, switch between them |
| `05-capability-toggle.sh` | Enable/disable capabilities |
| `06-doctor.sh` | Run doctor command |
| `07-full-workflow.sh` | Comprehensive 30-step workflow test |

## Structure

```
tests/integration/
├── run.sh                    # Orchestrator (builds images, runs containers)
├── docker/
│   ├── Dockerfile.node       # Node.js test container
│   └── Dockerfile.bun        # Bun test container
├── inside/
│   ├── run.sh                # Bash case runner (runs inside containers)
│   └── helpers.sh            # Shared assertion functions
└── cases/
    ├── 01-init-basic.sh
    ├── 02-add-capability.sh
    ├── 03-add-mcp.sh
    ├── 04-profile-switching.sh
    ├── 05-capability-toggle.sh
    ├── 06-doctor.sh
    └── 07-full-workflow.sh
```

## Adding new test cases

1. Create a new `.sh` file in `tests/integration/cases/`
2. Source the helpers: `source "${HELPERS_PATH}"`
3. Call `setup_testdir "prefix-"` to create isolated temp directory
4. Use `run_omnidev` to invoke CLI commands
5. Use assertion helpers to validate results

Example:

```bash
#!/usr/bin/env bash
set -euo pipefail

source "${HELPERS_PATH}"
setup_testdir "my-test-"

create_standard_fixture_toml
run_omnidev init claude-code
run_omnidev sync

assert_omni_structure
assert_capability_synced "standard"

success "my-test completed"
```
