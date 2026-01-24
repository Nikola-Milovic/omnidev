---
"@omnidev-ai/core": patch
---

Always rebuild capabilities with build scripts during sync

Sync now always rebuilds capabilities that have a build script in their package.json, ensuring the latest TypeScript changes are compiled even when dist/index.js already exists.
