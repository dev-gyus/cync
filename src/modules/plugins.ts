import * as path from 'path';
import {
  SyncModule,
  FileMapping,
  CopyResult,
  fileExists,
  copyMappedFiles,
} from './base-module.js';

export class PluginsModule implements SyncModule {
  name = 'plugins';
  description = 'Syncs plugin installation manifest';

  async getFiles(claudeDir: string): Promise<FileMapping[]> {
    const sourcePath = path.join(claudeDir, 'plugins', 'installed_plugins.json');
    if (!(await fileExists(sourcePath))) {
      return [];
    }

    return [
      {
        sourcePath,
        syncRepoPath: 'plugins/manifest.json',
      },
    ];
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
