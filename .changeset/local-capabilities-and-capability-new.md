---
"@omnidev-ai/core": minor
"@omnidev-ai/cli": minor
---

Add local capability support and capability creation command

- Add support for `file://` sources to load capabilities from local directories
- Add `capability new` command to scaffold new capabilities with interactive prompts
- Refactor adapter system with dedicated writers for hooks, skills, rules, and instructions
