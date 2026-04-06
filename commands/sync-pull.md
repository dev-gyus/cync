---
description: "Pull Claude Code settings from remote backup"
argument-hint: "[--module <names>] [--dry-run] [--backup] [--keep-local]"
allowed-tools: ["Bash(${CLAUDE_PLUGIN_ROOT}/scripts/sync-pull.sh:*)", "AskUserQuestion"]
---

# Sync Pull

Restore your Claude Code settings from the remote Git repository.

## Options
- `--module <names>`: Pull specific modules only (comma-separated)
- `--dry-run`: Preview changes without applying
- `--backup`: Create backup of current settings before pulling
- `--keep-local`: Keep all local files when conflicts are detected

## Execution Flow

You MUST follow this exact flow:

### Step 1: Check for conflicts

Run the pull script with `--check-conflicts` flag. Pass through any `--module` flags from `$ARGUMENTS`.

```
${CLAUDE_PLUGIN_ROOT}/scripts/sync-pull.sh --check-conflicts [--module flags if provided]
```

Parse the JSON output. The output is an array of `{ moduleName, conflicts }` where each conflict has:
- `syncRepoPath`: file path in sync repo
- `status`: `"new"` | `"identical"` | `"conflict"` | `"local-only"`

### Step 2: Evaluate conflicts

Count the files by status:
- `new`: Remote-only files that will be added (no conflict)
- `identical`: Files that are the same (no action needed)
- `conflict`: **Files that differ between local and remote — requires user decision**
- `local-only`: Local-only files (not affected)

If there are NO files with `"conflict"` status, skip to Step 4.

If `--keep-local` was passed in `$ARGUMENTS`, skip to Step 4 (all conflicts will be kept local).

### Step 3: Ask user about each conflict

Present the conflicting files in a clear table, then ask the user what to do for each one.

Example format:
```
다음 파일들이 로컬과 리모트에서 서로 다릅니다:

| # | 파일 | 처리 |
|---|------|------|
| 1 | core/CLAUDE.md | ? |
| 2 | core/settings.json | ? |
| 3 | skills/my-skill.md | ? |

각 파일에 대해 어떻게 처리할까요?
- **덮어쓰기** (리모트 내용으로 교체)
- **로컬 유지** (현재 로컬 파일 유지)
- **모두 덮어쓰기** / **모두 로컬 유지**

번호나 파일명으로 지정하거나, "모두 덮어쓰기" / "모두 유지" 로 일괄 처리할 수 있습니다.
```

Wait for the user's response and parse their choices.

### Step 4: Execute pull with resolutions

Build the final pull command based on user choices:

- Files the user chose to **overwrite** (or `new` status files): include in `--overwrite-files`
- Files the user chose to **keep local** (or `--keep-local` flag): include in `--skip-files`

```
${CLAUDE_PLUGIN_ROOT}/scripts/sync-pull.sh [--module flags] [--backup flag] --skip-files <comma-separated> --overwrite-files <comma-separated>
```

If no conflicts existed or user chose to overwrite all, just run:
```
${CLAUDE_PLUGIN_ROOT}/scripts/sync-pull.sh [original $ARGUMENTS without --keep-local and --check-conflicts]
```

### Step 5: Report results

Show the final summary of what was restored, skipped, and any errors.
