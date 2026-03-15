import * as path from 'path';
import { glob } from 'glob';
import {
  SyncModule,
  FileMapping,
  CopyResult,
  copyMappedFiles,
} from './base-module.js';

/**
 * Default exclusion patterns for full backup.
 * These cover noisy/transient directories and files that should not be synced.
 */
const DEFAULT_EXCLUDE_PATTERNS: string[] = [
  '**/*.jsonl',
  'debug/**',
  'telemetry/**',
  'shell-snapshots/**',
  'file-history/**',
  '**/*.lock',
  '**/*.highwatermark',
  'paste-cache/**',
  'sessions/**',
  'statsig/**',
  'chrome/**',
  'ide/**',
  'cache/**',
  'todos/**',
  'backups/**',
  'node_modules/**',
  '.cc-sync-repo/**',
  '.cc-sync.yml',
  '.cc-sync-*',
];

export class FullBackupModule implements SyncModule {
  name = 'full-backup';
  description = 'Full backup of ~/.claude/ with configurable exclusions';

  private excludePatterns: string[];

  constructor(excludePatterns?: string[]) {
    this.excludePatterns = excludePatterns ?? DEFAULT_EXCLUDE_PATTERNS;
  }

  async getFiles(claudeDir: string): Promise<FileMapping[]> {
    const files = await glob('**/*', {
      cwd: claudeDir,
      nodir: true,
      dot: true,
      ignore: this.excludePatterns,
    });

    return files.map((relPath) => ({
      sourcePath: path.join(claudeDir, relPath),
      syncRepoPath: `full/${relPath}`,
    }));
  }

  async copyToSyncRepo(claudeDir: string, syncRepoDir: string): Promise<CopyResult> {
    const mappings = await this.getFiles(claudeDir);
    return copyMappedFiles(mappings, claudeDir, syncRepoDir, 'toSync');
  }

  async copyFromSyncRepo(syncRepoDir: string, claudeDir: string): Promise<CopyResult> {
    const mappings = await this.getFiles(claudeDir);
    return copyMappedFiles(mappings, syncRepoDir, claudeDir, 'fromSync');
  }
}
