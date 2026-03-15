---
description: "Pull Claude Code settings from remote backup"
argument-hint: "[--module <names>] [--dry-run] [--backup] [--keep-local]"
allowed-tools: ["Bash(${CLAUDE_PLUGIN_ROOT}/scripts/sync-pull.sh:*)"]
---

# Sync Pull

Restore your Claude Code settings from the remote Git repository.

## Options
- `--module <names>`: Pull specific modules only (comma-separated)
- `--dry-run`: Preview changes without applying
- `--backup`: Create backup of current settings before pulling
- `--keep-local`: Keep local files when conflicts are detected

```!
"${CLAUDE_PLUGIN_ROOT}/scripts/sync-pull.sh" $ARGUMENTS
```
