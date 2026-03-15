import * as path from 'path';
import {
  SyncModule,
  FileMapping,
  CopyResult,
  fileExists,
  copyMappedFiles,
} from './base-module.js';

const CORE_FILES = [
  'CLAUDE.md',
  'COMMANDS.md',
  'FLAGS.md',
  'PRINCIPLES.md',
  'RULES.md',
  'MCP.md',
  'PERSONAS.md',
  'ORCHESTRATOR.md',
  'MODES.md',
  'settings.json',
  'settings.local.json',
  '.superclaude-metadata.json',
];

export class CoreSettingsModule implements SyncModule {
  name = 'core-settings';
  description = 'Syncs root-level framework documents and settings';

  async getFiles(claudeDir: string): Promise<FileMapping[]> {
    const mappings: FileMapping[] = [];

    for (const filename of CORE_FILES) {
      const sourcePath = path.join(claudeDir, filename);
      if (await fileExists(sourcePath)) {
        mappings.push({
          sourcePath,
          syncRepoPath: `core/${filename}`,
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
