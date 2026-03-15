import * as path from 'path';
import { fileExists, copyMappedFiles, } from './base-module.js';
export class PluginsModule {
    name = 'plugins';
    description = 'Syncs plugin installation manifest';
    async getFiles(claudeDir) {
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
    async copyToSyncRepo(claudeDir, syncRepoDir) {
        const mappings = await this.getFiles(claudeDir);
        return copyMappedFiles(mappings, claudeDir, syncRepoDir, 'toSync');
    }
    async copyFromSyncRepo(syncRepoDir, claudeDir) {
        const mappings = await this.getFiles(claudeDir);
        return copyMappedFiles(mappings, syncRepoDir, claudeDir, 'fromSync');
    }
}
//# sourceMappingURL=plugins.js.map