import * as path from 'path';
import { glob } from 'glob';
import {
  SyncModule,
  FileMapping,
  CopyResult,
  fileExists,
  copyMappedFiles,
} from './base-module.js';

export class PlansModule implements SyncModule {
  name = 'plans';
  description = 'Syncs plan files';

  async getFiles(claudeDir: string): Promise<FileMapping[]> {
    const plansDir = path.join(claudeDir, 'plans');
    if (!(await fileExists(plansDir))) {
      return [];
    }

    const files = await glob('*.md', {
      cwd: plansDir,
      nodir: true,
      dot: true,
    });

    return files.map((relPath) => ({
      sourcePath: path.join(plansDir, relPath),
      syncRepoPath: `plans/${relPath}`,
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
