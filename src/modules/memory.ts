import * as path from 'path';
import * as fs from 'fs/promises';
import { glob } from 'glob';
import {
  SyncModule,
  FileMapping,
  CopyResult,
  fileExists,
  copyMappedFiles,
} from './base-module.js';

export class MemoryModule implements SyncModule {
  name = 'memory';
  description = 'Syncs project-specific memory files';

  async getFiles(claudeDir: string): Promise<FileMapping[]> {
    const projectsDir = path.join(claudeDir, 'projects');
    if (!(await fileExists(projectsDir))) {
      return [];
    }

    const mappings: FileMapping[] = [];

    // List project directories
    const entries = await fs.readdir(projectsDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const projectDir = path.join(projectsDir, entry.name);
      const projectName = entry.name;

      // Collect memory/** files
      const memoryDir = path.join(projectDir, 'memory');
      if (await fileExists(memoryDir)) {
        const memoryFiles = await glob('**/*', {
          cwd: memoryDir,
          nodir: true,
          dot: true,
        });

        for (const relPath of memoryFiles) {
          mappings.push({
            sourcePath: path.join(memoryDir, relPath),
            syncRepoPath: `memory/${projectName}/${relPath}`,
          });
        }
      }

      // Collect MEMORY.md at project root
      const memoryMdPath = path.join(projectDir, 'MEMORY.md');
      if (await fileExists(memoryMdPath)) {
        mappings.push({
          sourcePath: memoryMdPath,
          syncRepoPath: `memory/${projectName}/MEMORY.md`,
        });
      }
    }

    return mappings;
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
