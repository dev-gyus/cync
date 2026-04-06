import { execSync } from 'node:child_process';

export class GitError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly cause?: Error,
  ) {
    super(message);
    this.name = 'GitError';
  }
}

function exec(command: string, cwd?: string): string {
  try {
    return execSync(command, {
      cwd,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
  } catch (err) {
    const error = err as Error & { stderr?: string; status?: number };
    const stderr = error.stderr ?? error.message;

    if (stderr.includes('not a git repository')) {
      throw new GitError(
        `Not a git repository: ${cwd ?? process.cwd()}`,
        'NOT_A_REPO',
        error,
      );
    }
    if (
      stderr.includes('Could not resolve host') ||
      stderr.includes('unable to access') ||
      stderr.includes('fatal: repository') ||
      stderr.includes('Connection refused')
    ) {
      throw new GitError(
        `Remote unreachable: ${stderr}`,
        'REMOTE_UNREACHABLE',
        error,
      );
    }
    if (stderr.includes('Authentication failed') || stderr.includes('Permission denied')) {
      throw new GitError(
        `Authentication failed: ${stderr}`,
        'AUTH_FAILED',
        error,
      );
    }
    if (stderr.includes('CONFLICT') || stderr.includes('Merge conflict')) {
      throw new GitError(
        `Merge conflict detected: ${stderr}`,
        'MERGE_CONFLICT',
        error,
      );
    }

    throw new GitError(
      `Git command failed: ${command}\n${stderr}`,
      'GIT_COMMAND_FAILED',
      error,
    );
  }
}

/**
 * Check if git is installed and available on PATH.
 */
export function isGitInstalled(): boolean {
  try {
    execSync('git --version', { stdio: ['pipe', 'pipe', 'pipe'] });
    return true;
  } catch {
    return false;
  }
}

/**
 * Ensure git is installed, throwing a descriptive error if not.
 */
function requireGit(): void {
  if (!isGitInstalled()) {
    throw new GitError(
      'Git is not installed or not found on PATH. Please install git first.',
      'GIT_NOT_FOUND',
    );
  }
}

/**
 * Clone a remote repository into a local directory.
 */
export function gitClone(url: string, dir: string): void {
  requireGit();
  exec(`git clone "${url}" "${dir}"`);
}

/**
 * Initialize a new git repository in the given directory.
 */
export function gitInit(dir: string): void {
  requireGit();
  exec('git init', dir);
}

/**
 * Add a named remote to the repository.
 */
export function gitAddRemote(dir: string, name: string, url: string): void {
  requireGit();
  exec(`git remote add "${name}" "${url}"`, dir);
}

/**
 * Pull from the remote. When a branch is specified the command explicitly
 * targets that branch so the local tracking configuration is ignored.
 */
export function gitPull(dir: string, branch?: string): void {
  requireGit();
  const branchArg = branch ? ` origin ${branch}` : '';
  exec(`git pull${branchArg}`, dir);
}

/**
 * Push to the remote. When a branch is specified, uses HEAD:<branch> syntax
 * so it works regardless of the local branch name. Optionally force-push.
 */
export function gitPush(dir: string, force = false, branch?: string): void {
  requireGit();
  const forceFlag = force ? ' --force' : '';
  const branchArg = branch ? ` origin HEAD:${branch}` : '';
  exec(`git push${forceFlag}${branchArg}`, dir);
}

/**
 * Stage files for commit. Defaults to staging all changes.
 */
export function gitAdd(dir: string, files?: string[]): void {
  requireGit();
  if (files && files.length > 0) {
    const escaped = files.map((f) => `"${f}"`).join(' ');
    exec(`git add ${escaped}`, dir);
  } else {
    exec('git add -A', dir);
  }
}

/**
 * Create a commit with the given message.
 */
export function gitCommit(dir: string, message: string): void {
  requireGit();
  const escaped = message.replace(/"/g, '\\"');
  exec(`git commit -m "${escaped}"`, dir);
}

/**
 * Get the working tree status (short format).
 */
export function gitStatus(dir: string): string {
  requireGit();
  return exec('git status --porcelain', dir);
}

/**
 * Get the diff of unstaged changes.
 */
export function gitDiff(dir: string): string {
  requireGit();
  return exec('git diff', dir);
}

/**
 * Get recent commit log entries.
 */
export function gitLog(dir: string, count = 10): string {
  requireGit();
  return exec(`git log --oneline -n ${count}`, dir);
}
