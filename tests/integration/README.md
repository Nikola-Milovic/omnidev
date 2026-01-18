# Docker Integration Tests

Runs end-to-end CLI flows in clean Ubuntu containers:

- `omnidev init` (non-interactive via provider args)
- `omnidev sync`
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

Defined in `tests/integration/cases.json`.

