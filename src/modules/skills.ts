import * as path from 'path';
import { glob } from 'glob';
import {
  SyncModule,
  FileMapping,
  CopyResult,
  fileExists,
  copyMappedFiles,
} from './base-module.js';

export class SkillsModule implements SyncModule {
  name = 'skills';
  description = 'Syncs ~/.claude/skills/ directory recursively';

  async getFiles(claudeDir: string): Promise<FileMapping[]> {
    const skillsDir = path.join(claudeDir, 'skills');
    if (!(await fileExists(skillsDir))) {
      return [];
    }

    const files = await glob('**/*', {
      cwd: skillsDir,
      nodir: true,
      dot: true,
    });

    return files.map((relPath) => ({
      sourcePath: path.join(skillsDir, relPath),
      syncRepoPath: `skills/${relPath}`,
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
