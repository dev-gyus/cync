# cync

Backup and sync your Claude Code settings to the cloud via Git.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## Overview

`cync` is a Claude Code plugin that versions your `~/.claude/` directory in a private Git repository. Push from one machine, pull on another — keeping your settings, skills, commands, and memory in sync across all your devices.

## Features

- **Git-based backup & restore** — Version-control your `~/.claude/` settings. Push from one device and pull on another.
- **Module-based sync** — Choose only what you need: `core`, `skills`, `commands`, `memory`, `plugins`, `plans`, or a full backup.
- **Sensitive data scanning** — Automatically scans files for API keys, tokens, and secrets before every push. Shows a masked preview with a warning if anything is detected.
- **AES-256-GCM encryption (optional)** — Set `CC_SYNC_KEY` in your environment to encrypt synced files at rest.
- **Dry-run mode** — Preview push/pull results without making any changes.
- **Conflict resolution** — When pulling, decide file-by-file whether to overwrite with remote or keep local.

## Prerequisites

- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) installed
- Git
- Node.js 18+

## Installation

### Quick install (one-liner)

프로젝트 루트에서 실행:

```bash
claude plugin marketplace add ./ && claude plugin install cync
```

### Step-by-step

```bash
# 1. 로컬 마켓플레이스 등록
claude plugin marketplace add ./

# 2. 플러그인 설치
claude plugin install cync
```

### 다른 머신에서 설치 (git clone)

```bash
git clone https://github.com/dev-gyus/cync.git
cd cync
claude plugin marketplace add ./ && claude plugin install cync
```

## Quick Start

**1. Create a private repository** on GitHub (or any Git host), then initialize sync:

```
/sync-init git@github.com:you/claude-settings.git
```

**2. Push your settings:**

```
/sync-push
```

**3. Pull on another machine:**

```
/sync-pull
```

## Commands

| Command | Description |
|---------|-------------|
| `/sync-init <remote-url>` | Connect to a Git repository and initialize sync |
| `/sync-push [options]` | Push local settings to remote |
| `/sync-pull [options]` | Pull remote settings to local |
| `/sync-status` | Show sync status and per-module change counts |
| `/sync-help` | Display help and usage examples |

### `/sync-init <remote-url>`

```
/sync-init git@github.com:you/claude-settings.git
/sync-init --module core,skills,commands,memory https://github.com/you/claude-settings.git
```

Clones (or initializes) a sync repository at `~/.claude/.cc-sync-repo/` and creates a config file.

### `/sync-push [options]`

| Option | Description |
|--------|-------------|
| `--module <names>` | Modules to push (comma-separated; default: all enabled) |
| `--message <msg>` | Custom commit message |
| `--dry-run` | Preview changes without pushing |
| `--force` | Force push |

### `/sync-pull [options]`

| Option | Description |
|--------|-------------|
| `--module <names>` | Modules to pull (comma-separated) |
| `--dry-run` | Preview changes without applying |
| `--backup` | Create a timestamped backup of current settings before pulling |
| `--keep-local` | Keep all local files on conflict |

#### Conflict resolution

When local and remote files differ, each conflict is resolved interactively:

| Status | Meaning | Action |
|--------|---------|--------|
| `new` | Remote-only file | Copied automatically |
| `identical` | Both sides match | Skipped |
| `conflict` | Both sides differ | You choose: overwrite or keep local |
| `local-only` | Local-only file | Left untouched |

### `/sync-status`

Displays remote URL, branch, machine ID, last sync time, and per-module changed file counts.

## Configuration

Settings are stored in `~/.claude/.cc-sync.yml`. Auto-created by `/sync-init`; you can also edit it directly.

```yaml
# Git remote URL
remote: "git@github.com:you/claude-settings.git"

# Sync branch
branch: "main"

# Modules to sync
modules:
  core: true        # CLAUDE.md, framework docs, settings.json
  skills: true      # ~/.claude/skills/
  commands: true    # ~/.claude/commands/
  memory: false     # Per-project memory files
  plugins: false    # Plugin install manifest
  plans: false      # Plan files
  full: false       # Full backup (exclusion patterns applied)

# Sensitive data handling
sensitive:
  encrypt: false    # AES-256-GCM encryption (requires CC_SYNC_KEY)
  exclude:          # Patterns excluded from sync
    - "*.jsonl"
    - "debug/"
    - "telemetry/"
    - "shell-snapshots/"
    - "file-history/"
    - "*.lock"
    - "*.highwatermark"
    - "paste-cache/"
    - "sessions/"
    - "statsig/"
    - "chrome/"
    - "ide/"
    - "cache/"
    - "todos/"
    - "backups/"

# Machine identifier included in commit messages
machine_id: ""
```

## Modules

| Module | What it syncs | Default |
|--------|---------------|---------|
| `core` | `CLAUDE.md`, framework docs (`COMMANDS.md`, `FLAGS.md`, …), `settings.json` | Enabled |
| `skills` | `~/.claude/skills/` (recursive) | Enabled |
| `commands` | `~/.claude/commands/` (recursive) | Enabled |
| `memory` | `~/.claude/projects/*/memory/` per-project memory files | Disabled |
| `plugins` | Plugin install manifest (`installed_plugins.json`) | Disabled |
| `plans` | `~/.claude/plans/` plan markdown files | Disabled |
| `full` | All of `~/.claude/` with exclusion patterns applied | Disabled |

### Selecting modules

**At init time:**
```
/sync-init git@github.com:you/repo.git --module core,skills,commands,memory
```

**Per-command override:**
```
/sync-push --module core,skills
/sync-pull --module core,skills,memory
```

**Editing the config file directly:**

Modify the `modules` section in `~/.claude/.cc-sync.yml`.

## Security

### Sensitive data scanning

Before committing, `/sync-push` scans every file for:

- API keys, tokens, passwords, secrets
- PEM-format private keys
- Service-specific patterns (OpenAI `sk-*`, GitHub `ghp_*`, AWS access keys, etc.)

Detected secrets are shown with a masked preview as a warning. The file is still pushed — giving you the chance to review and decide.

### Recommendations

- **Use a private repository.** Claude Code settings can contain personal instructions, project context, and API references.
- **Enable encryption.** Set `sensitive.encrypt: true` in `.cc-sync.yml` and export `CC_SYNC_KEY`:

```bash
# Generate a key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Add to your shell profile
export CC_SYNC_KEY="your-64-char-hex-key"
```

### Default exclusion patterns

The `full` module automatically excludes noise and temporary paths: `sessions/`, `cache/`, `telemetry/`, `debug/`, `todos/`, `backups/`, `*.jsonl`, `*.lock`, `.cc-sync-repo/`, and more.

## Examples

```bash
# Push specific modules with a custom message
/sync-push --module core,skills --message "Update framework docs"

# Preview changes before pushing
/sync-push --dry-run

# Pull only core, creating a backup first
/sync-pull --backup --module core

# Keep all local files when conflicts arise
/sync-pull --keep-local
```

## Development

```bash
# Clone
git clone https://github.com/dev-gyus/cync.git
cd cync

# Install dependencies
npm install

# Build
npm run build

# Run tests
npm test

# Watch mode
npm run test:watch
```

## Project Structure

```
cync/
├── .claude-plugin/
│   ├── plugin.json        # Plugin manifest
│   └── marketplace.json   # Marketplace metadata
├── commands/              # Slash command definitions (Markdown)
│   ├── sync-init.md
│   ├── sync-push.md
│   ├── sync-pull.md
│   ├── sync-status.md
│   └── sync-help.md
├── scripts/               # Command execution shell scripts
├── src/
│   ├── cli.ts             # CLI entry point (Commander.js)
│   ├── config.ts          # .cc-sync.yml loader/saver
│   ├── sync-engine.ts     # Core sync logic (init, push, pull, status)
│   ├── modules/           # Sync module implementations
│   │   ├── base-module.ts # SyncModule interface and file-copy helpers
│   │   ├── core-settings.ts
│   │   ├── skills.ts
│   │   ├── commands.ts
│   │   ├── memory.ts
│   │   ├── plugins.ts
│   │   ├── plans.ts
│   │   ├── full-backup.ts
│   │   └── index.ts       # Module registry
│   └── utils/
│       ├── git.ts              # Git command wrappers
│       ├── sensitive-scanner.ts # Secret detection
│       ├── crypto.ts           # AES-256-GCM encrypt/decrypt
│       ├── file-mapper.ts      # File mapping utilities
│       └── logger.ts           # Console output helpers
├── tests/
│   ├── unit/              # Unit tests
│   ├── integration/       # Integration tests
│   └── fixtures/          # Test fixtures
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

## Roadmap

- [ ] Auto-sync daemon — a companion `sync-watch` command using `chokidar` to watch `~/.claude/` and push on change; installable as a launchd (macOS) or systemd (Linux) service
- [ ] Three-way merge — use `git merge-file` or the `diff3` package to auto-merge non-conflicting lines in text files, falling back to interactive prompt only for true conflicts
- [ ] Per-module encryption — configure `encrypt: true` per module rather than globally (the `crypto.ts` infrastructure already exists)
- [ ] Diff viewer integration — show colored diffs before push/pull via `git diff`, or open files side-by-side in VS Code with `code --diff`
- [ ] Multi-device branches — push/pull from a machine-specific branch (e.g. `sync/macbook-pro`) and merge into `main` when ready

## License

[MIT](LICENSE)
