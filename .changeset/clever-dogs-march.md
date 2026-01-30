---
"@omnidev-ai/core": patch
---

Fix sync failing when local and remote capability branches have diverged

Replaces `git pull --ff-only` with `git reset --hard` when fetching capability sources, ensuring the sync always matches the remote state regardless of local changes or divergent history.
