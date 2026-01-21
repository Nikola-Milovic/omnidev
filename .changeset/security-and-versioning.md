---
"@omnidev-ai/core": minor
"@omnidev-ai/cli": minor
---

Add security scanning and capability versioning

- Add supply-chain security scanning for capabilities (unicode attacks, symlink escapes, suspicious scripts)
- Add `omnidev security issues` command to scan for security issues
- Add `omnidev security allow/deny` commands to manage allowed findings
- Add capability versioning with content hashing and git commit tracking
- Add `--programmatic` flag to `capability new` for TypeScript capabilities with CLI commands
- Fix capability ID inference from `--path` for GitHub sources
