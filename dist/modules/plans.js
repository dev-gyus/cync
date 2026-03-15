import * as path from 'path';
import { glob } from 'glob';
import { fileExists, copyMappedFiles, } from './base-module.js';
export class PlansModule {
    name = 'plans';
    description = 'Syncs plan files';
    async getFiles(claudeDir) {
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
    async copyToSyncRepo(claudeDir, syncRepoDir) {
        const mappings = await this.getFiles(claudeDir);
        return copyMappedFiles(mappings, claudeDir, syncRepoDir, 'toSync');
    }
    async copyFromSyncRepo(syncRepoDir, claudeDir) {
        const mappings = await this.getFiles(claudeDir);
        return copyMappedFiles(mappings, syncRepoDir, claudeDir, 'fromSync');
    }
}
//# sourceMappingURL=plans.js.map