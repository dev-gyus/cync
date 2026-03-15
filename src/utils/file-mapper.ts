import { readFile, mkdir, copyFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

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
export async function copyFiles(
  mappings: FileMapping[],
  targetBaseDir: string,
): Promise<CopyResult> {
  const result: CopyResult = {
    copied: [],
    skipped: [],
    errors: [],
  };

  for (const mapping of mappings) {
    const destPath = join(targetBaseDir, mapping.syncRepoPath);

    try {
      // Ensure destination directory exists
      await ensureDir(dirname(destPath));

      // Check if the destination already exists and is identical
      const identical = await compareFiles(mapping.sourcePath, destPath);
      if (identical) {
        result.skipped.push(mapping.syncRepoPath);
        continue;
      }

      await copyFile(mapping.sourcePath, destPath);
      result.copied.push(mapping.syncRepoPath);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : String(err);
      result.errors.push(`${mapping.syncRepoPath}: ${message}`);
    }
  }

  return result;
}

/**
 * Compare two files byte-by-byte. Returns true if the files are identical.
 * Returns false if either file does not exist or the contents differ.
 */
export async function compareFiles(
  file1: string,
  file2: string,
): Promise<boolean> {
  try {
    const [buf1, buf2] = await Promise.all([
      readFile(file1),
      readFile(file2),
    ]);
    return buf1.equals(buf2);
  } catch {
    // If either file doesn't exist or can't be read, they are not identical
    return false;
  }
}

/**
 * Create a directory and all its parents recursively (like mkdir -p).
 */
export async function ensureDir(dir: string): Promise<void> {
  await mkdir(dir, { recursive: true });
}
