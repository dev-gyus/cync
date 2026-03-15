export declare class GitError extends Error {
    readonly code: string;
    readonly cause?: Error | undefined;
    constructor(message: string, code: string, cause?: Error | undefined);
}
/**
 * Check if git is installed and available on PATH.
 */
export declare function isGitInstalled(): boolean;
/**
 * Clone a remote repository into a local directory.
 */
export declare function gitClone(url: string, dir: string): void;
/**
 * Initialize a new git repository in the given directory.
 */
export declare function gitInit(dir: string): void;
/**
 * Add a named remote to the repository.
 */
export declare function gitAddRemote(dir: string, name: string, url: string): void;
/**
 * Pull from the default remote and branch.
 */
export declare function gitPull(dir: string): void;
/**
 * Push to the default remote. Optionally force-push.
 */
export declare function gitPush(dir: string, force?: boolean): void;
/**
 * Stage files for commit. Defaults to staging all changes.
 */
export declare function gitAdd(dir: string, files?: string[]): void;
/**
 * Create a commit with the given message.
 */
export declare function gitCommit(dir: string, message: string): void;
/**
 * Get the working tree status (short format).
 */
export declare function gitStatus(dir: string): string;
/**
 * Get the diff of unstaged changes.
 */
export declare function gitDiff(dir: string): string;
/**
 * Get recent commit log entries.
 */
export declare function gitLog(dir: string, count?: number): string;
