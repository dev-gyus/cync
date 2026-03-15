# claude-code-sync

Backup and sync your Claude Code settings to a Git repository.

<!-- badges -->
<!-- [![npm version](https://img.shields.io/npm/v/claude-code-sync)](https://www.npmjs.com/package/claude-code-sync) -->
<!-- [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE) -->

## Features

- **Git-based backup & restore** -- Your `~/.claude/` settings are version-controlled in a private repo. Push from one machine, pull on another.
- **Modular sync** -- Choose what to sync: core settings, skills, commands, memory, plugins, plans, or a full backup.
- **Sensitive data scanning** -- Files are scanned for API keys, tokens, and secrets before every push. Matches are flagged with redacted previews.
- **Optional AES-256-GCM encryption** -- Encrypt synced files with a key stored in `CC_SYNC_KEY`.
- **Dry-run mode** -- Preview exactly what would be pushed or pulled before making changes.

## Quick Start

### Prerequisites

- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) installed
- Git
- Node.js 18+

### Install as a Claude Code plugin

```bash
claude plugin add /path/to/claude-code-sync
```

### Initialize

Connect to a Git repository (create a **private** repo first):

```
/sync-init git@github.com:you/claude-settings.git
```

### Push settings

```
/sync-push
```

### Pull settings on another machine

```
/sync-pull
```

## Commands

| Command | Description |
|---------|-------------|
| `/sync-init <remote-url>` | Initialize sync with a remote Git repository |
| `/sync-push [options]` | Push local settings to the remote backup |
| `/sync-pull [options]` | Pull settings from the remote to local |
| `/sync-status` | Show sync status and per-module change summary |
| `/sync-help` | Show help and usage examples |

### `/sync-init <remote-url>`

```
/sync-init git@github.com:you/claude-settings.git
/sync-init --module core,skills,commands,memory https://github.com/you/claude-settings.git
```

Clones (or initializes) the sync repo at `~/.claude/.cc-sync-repo/` and writes the config file.

### `/sync-push [options]`

| Option | Description |
|--------|-------------|
| `--module <names>` | Comma-separated modules to push (default: all enabled) |
| `--message <msg>` | Custom commit message |
| `--dry-run` | Preview changes without pushing |
| `--force` | Force push to remote |

### `/sync-pull [options]`

| Option | Description |
|--------|-------------|
| `--module <names>` | Comma-separated modules to pull |
| `--dry-run` | Preview changes without applying |
| `--backup` | Create a timestamped backup before pulling |
| `--keep-local` | Keep local files on conflict |

### `/sync-status`

Displays remote URL, branch, machine ID, last sync time, and a table of modules with their change counts.

## Configuration

Settings are stored in `~/.claude/.cc-sync.yml`. It is created automatically by `/sync-init`, but you can edit it manually.

```yaml
# Git remote URL
remote: "git@github.com:you/claude-settings.git"

# Branch to sync
branch: "main"

# Which modules to sync
modules:
  core: true        # CLAUDE.md, framework docs, settings.json
  skills: true      # ~/.claude/skills/
  commands: true    # ~/.claude/commands/
  memory: false     # Project memory files
  plugins: false    # Plugin install manifest
  plans: false      # Plan files
  full: false       # Full backup (with exclusions)

# Sensitive data handling
sensitive:
  encrypt: false    # Enable AES-256-GCM encryption (requires CC_SYNC_KEY)
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

# Identifies this machine in commit messages
machine_id: ""
```

## Modules

| Module | What it syncs | Default |
|--------|---------------|---------|
| `core` | `CLAUDE.md`, framework docs (`COMMANDS.md`, `FLAGS.md`, etc.), `settings.json` | Enabled |
| `skills` | `~/.claude/skills/` directory (recursive) | Enabled |
| `commands` | `~/.claude/commands/` directory (recursive) | Enabled |
| `memory` | Per-project memory files from `~/.claude/projects/*/memory/` | Disabled |
| `plugins` | Plugin installation manifest (`installed_plugins.json`) | Disabled |
| `plans` | Plan markdown files from `~/.claude/plans/` | Disabled |
| `full` | Everything in `~/.claude/` minus default exclusions (sessions, cache, telemetry, etc.) | Disabled |

## Security

### Sensitive data scanning

Every `/sync-push` scans files for common secret patterns before committing:

- API keys, tokens, passwords, secrets
- Private keys (PEM format)
- Provider-specific keys (OpenAI `sk-*`, GitHub `ghp_*`, AWS access keys)

Detected matches are logged with redacted previews. Files are still pushed -- the warning gives you a chance to review.

### Recommendations

- **Use a private repository.** Your Claude Code settings may contain personal instructions, project context, or API references.
- **Enable encryption** for extra protection. Set `sensitive.encrypt: true` in `.cc-sync.yml` and export `CC_SYNC_KEY` with a 256-bit hex key:

```bash
# Generate a key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Set it in your shell profile
export CC_SYNC_KEY="your-64-char-hex-key"
```

### Default exclusions

The `full` module automatically excludes noisy/transient paths: `sessions/`, `cache/`, `telemetry/`, `debug/`, `todos/`, `backups/`, `*.jsonl`, `*.lock`, `.cc-sync-repo/`, and more.

## Development

```bash
# Clone
git clone https://github.com/you/claude-code-sync.git
cd claude-code-sync

# Install dependencies
npm install

# Build
npm run build

# Run tests
npm test

# Watch mode
npm run test:watch
```

### Project structure

```
claude-code-sync/
├── commands/              # Slash command definitions (markdown)
│   ├── sync-init.md
│   ├── sync-push.md
│   ├── sync-pull.md
│   ├── sync-status.md
│   └── sync-help.md
├── scripts/               # Shell wrappers that invoke the CLI
├── src/
│   ├── cli.ts             # CLI entry point (commander)
│   ├── config.ts          # .cc-sync.yml loader/saver
│   ├── sync-engine.ts     # Core sync logic (init, push, pull, status)
│   ├── modules/           # Sync module implementations
│   │   ├── base-module.ts # SyncModule interface and file copy helpers
│   │   ├── core-settings.ts
│   │   ├── skills.ts
│   │   ├── commands.ts
│   │   ├── memory.ts
│   │   ├── plugins.ts
│   │   ├── plans.ts
│   │   └── full-backup.ts
│   └── utils/
│       ├── git.ts              # Git command wrappers
│       ├── sensitive-scanner.ts # Secret detection
│       ├── crypto.ts           # AES-256-GCM encrypt/decrypt
│       ├── file-mapper.ts      # File mapping utilities
│       └── logger.ts           # Console output helpers
├── .claude-plugin/
│   └── plugin.json        # Plugin metadata
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

## Roadmap

- [ ] Auto-sync via Git hooks or file watchers
- [ ] Bidirectional conflict resolution (three-way merge)
- [ ] Storage adapters beyond Git (S3, Google Drive)
- [ ] Per-module encryption granularity
- [ ] Web UI for diff preview

## License

[MIT](LICENSE)
