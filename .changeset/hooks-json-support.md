---
"@omnidev-ai/core": minor
"@omnidev-ai/cli": minor
---

Add hooks.json support for Claude plugin wrapping

- Support loading hooks from `hooks.json` (Claude plugin format) in addition to `hooks.toml`
- Check for hooks in: `hooks/hooks.toml` (priority), `hooks/hooks.json`, and `hooks.json` (root)
- Resolve `${CLAUDE_PLUGIN_ROOT}` and `${OMNIDEV_CAPABILITY_ROOT}` to absolute paths during loading
- Add `resolveCapabilityRoot` option to hook loading
- Update CLI help text to mention Claude plugin auto-wrapping
- Add integration test for Claude plugin wrapping flow
