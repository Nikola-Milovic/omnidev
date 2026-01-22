---
"@omnidev-ai/cli": minor
---

Improve capability versioning system

- Rename `ref` to `version` in capability source configs for clearer semantics
- Rename `ref` to `pinned_version` in lock file entries
- Add `--pin` flag to `omnidev add cap` for automatic version detection
- Add version mismatch warnings during sync
- Add `--verbose` flag to `capability list` to check for updates
- Add integrity verification for capability sources
- Git sources now always include `version` field (defaults to "latest")
- File sources remain simple strings (no version field)

**Breaking Change:** Old configs using `ref` must be updated to use `version`. Run `omnidev sync` to regenerate lock files.
