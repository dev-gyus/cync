---
description: "Push Claude Code settings to remote backup"
argument-hint: "[--module <names>] [--message <msg>] [--dry-run] [--force]"
allowed-tools: ["Bash(${CLAUDE_PLUGIN_ROOT}/scripts/sync-push.sh:*)"]
---

# Sync Push

Backup your Claude Code settings to the remote Git repository.

## Options
- `--module <names>`: Push specific modules only (comma-separated: core,skills,commands)
- `--message <msg>`: Custom commit message
- `--dry-run`: Preview changes without pushing
- `--force`: Force push (overwrites remote)

```!
${CLAUDE_PLUGIN_ROOT}/scripts/sync-push.sh $ARGUMENTS
```
