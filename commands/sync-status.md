---
description: "Show Claude Code sync status"
argument-hint: ""
allowed-tools: ["Bash(${CLAUDE_PLUGIN_ROOT}/scripts/sync-status.sh:*)"]
---

# Sync Status

Show the current sync status including remote info, last sync time, and per-module change summary.

```!
${CLAUDE_PLUGIN_ROOT}/scripts/sync-status.sh $ARGUMENTS
```
