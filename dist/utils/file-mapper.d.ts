export interface FileMapping {
    /** Absolute path to the source file (e.g., ~/.claude/CLAUDE.md) */
    sourcePath: string;
    /** Relative path within the sync repo (e.g., core/CLAUDE.md) */
    syncRepoPath: string;
}
export interface CopyResult {
    copied: string[];
    skipped: string[];
    errors: string[];
}
/**
 * Copy source files to the target base directory using syncRepoPath as the
 * relative destination. Files that are already identical are skipped.
 */
export declare function copyFiles(mappings: FileMapping[], targetBaseDir: string): Promise<CopyResult>;
/**
 * Compare two files byte-by-byte. Returns true if the files are identical.
 * Returns false if either file does not exist or the contents differ.
 */
export declare function compareFiles(file1: string, file2: string): Promise<boolean>;
/**
 * Create a directory and all its parents recursively (like mkdir -p).
 */
export declare function ensureDir(dir: string): Promise<void>;
