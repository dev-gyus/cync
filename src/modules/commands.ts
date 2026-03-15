import * as path from 'path';
import { glob } from 'glob';
import {
  SyncModule,
  FileMapping,
  CopyResult,
  fileExists,
  copyMappedFiles,
} from './base-module.js';

export class CommandsModule implements SyncModule {
  name = 'commands';
  description = 'Syncs ~/.claude/commands/ directory recursively';

  async getFiles(claudeDir: string): Promise<FileMapping[]> {
    const commandsDir = path.join(claudeDir, 'commands');
    if (!(await fileExists(commandsDir))) {
      return [];
    }

    const files = await glob('**/*', {
      cwd: commandsDir,
      nodir: true,
      dot: true,
    });

    return files.map((relPath) => ({
      sourcePath: path.join(commandsDir, relPath),
      syncRepoPath: `commands/${relPath}`,
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
