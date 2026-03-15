import * as path from 'path';
import { fileExists, copyMappedFiles, } from './base-module.js';
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
export class CoreSettingsModule {
    name = 'core-settings';
    description = 'Syncs root-level framework documents and settings';
    async getFiles(claudeDir) {
        const mappings = [];
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
    async copyToSyncRepo(claudeDir, syncRepoDir) {
        const mappings = await this.getFiles(claudeDir);
        return copyMappedFiles(mappings, claudeDir, syncRepoDir, 'toSync');
    }
    async copyFromSyncRepo(syncRepoDir, claudeDir) {
        const mappings = await this.getFiles(claudeDir);
        return copyMappedFiles(mappings, syncRepoDir, claudeDir, 'fromSync');
    }
}
//# sourceMappingURL=core-settings.js.map