import * as fs from 'fs/promises';
import * as path from 'path';

export interface FileMapping {
  sourcePath: string;      // absolute path
  syncRepoPath: string;    // relative path in sync repo
}

export interface CopyResult {
  copied: string[];
  skipped: string[];
  errors: string[];
}

export interface SyncModule {
  name: string;
  description: string;
  getFiles(claudeDir: string): Promise<FileMapping[]>;
  copyToSyncRepo(claudeDir: string, syncRepoDir: string): Promise<CopyResult>;
  copyFromSyncRepo(syncRepoDir: string, claudeDir: string): Promise<CopyResult>;
}

/**
 * Check whether a file or directory exists at the given path.
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Copy files described by a set of mappings.
 *
 * @param mappings  - Array of FileMapping objects produced by a module's getFiles().
 * @param sourceBase - When direction is 'toSync' this is claudeDir; otherwise syncRepoDir.
 * @param targetBase - When direction is 'toSync' this is syncRepoDir; otherwise claudeDir.
 * @param direction  - 'toSync' copies sourcePath -> syncRepoPath under targetBase.
 *                     'fromSync' copies syncRepoPath under sourceBase -> sourcePath.
 */
export async function copyMappedFiles(
  mappings: FileMapping[],
  sourceBase: string,
  targetBase: string,
  direction: 'toSync' | 'fromSync',
): Promise<CopyResult> {
  const result: CopyResult = {
    copied: [],
    skipped: [],
    errors: [],
  };

  for (const mapping of mappings) {
    let src: string;
    let dest: string;

    if (direction === 'toSync') {
      src = mapping.sourcePath;
      dest = path.join(targetBase, mapping.syncRepoPath);
    } else {
      src = path.join(sourceBase, mapping.syncRepoPath);
      dest = mapping.sourcePath;
    }

    try {
      const srcExists = await fileExists(src);
      if (!srcExists) {
        result.skipped.push(src);
        continue;
      }

      await fs.mkdir(path.dirname(dest), { recursive: true });
      await fs.copyFile(src, dest);
      result.copied.push(mapping.syncRepoPath);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      result.errors.push(`${mapping.syncRepoPath}: ${message}`);
    }
  }

  return result;
}
