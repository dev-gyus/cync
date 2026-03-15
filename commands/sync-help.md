---
description: "Show Claude Code Sync help"
argument-hint: ""
allowed-tools: []
---

# Claude Code Sync - Help

Backup and sync your Claude Code settings to a Git repository.

## Commands

| Command | Description |
|---------|-------------|
| `/sync-init <url>` | Connect to a Git repo for settings backup |
| `/sync-push` | Push local settings to remote |
| `/sync-pull` | Pull settings from remote to local |
| `/sync-status` | Show current sync status |

## Quick Start

1. Create a private GitHub repository for your settings
2. Run `/sync-init git@github.com:you/claude-settings.git`
3. Use `/sync-push` to backup and `/sync-pull` to restore

## Modules

| Module | Description | Default |
|--------|-------------|---------|
| core | CLAUDE.md, framework docs, settings.json | Enabled |
| skills | Custom skills (~/.claude/skills/) | Enabled |
| commands | Custom commands (~/.claude/commands/) | Enabled |
| memory | Project memory files | Disabled |
| plugins | Plugin install manifest | Disabled |
| plans | Execution plans | Disabled |
| full | Full backup (with exclusions) | Disabled |

## Examples

```
/sync-push --module core,skills --message "Updated framework"
/sync-pull --backup --module core
/sync-push --dry-run
```
