---
description: "Initialize Claude Code sync - connect to a GitHub repo for settings backup"
argument-hint: "<remote-url>"
allowed-tools: ["Bash(${CLAUDE_PLUGIN_ROOT}/scripts/sync-init.sh:*)"]
---

# Sync Init

Initialize Claude Code settings sync by connecting to a Git remote repository.

## Usage
Provide the Git remote URL (SSH or HTTPS) of the repository to use for settings backup.

```!
${CLAUDE_PLUGIN_ROOT}/scripts/sync-init.sh $ARGUMENTS
```
