import * as path from 'path';
import { glob } from 'glob';
import { fileExists, copyMappedFiles, } from './base-module.js';
export class SkillsModule {
    name = 'skills';
    description = 'Syncs ~/.claude/skills/ directory recursively';
    async getFiles(claudeDir) {
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
    async copyToSyncRepo(claudeDir, syncRepoDir) {
        const mappings = await this.getFiles(claudeDir);
        return copyMappedFiles(mappings, claudeDir, syncRepoDir, 'toSync');
    }
    async copyFromSyncRepo(syncRepoDir, claudeDir) {
        const mappings = await this.getFiles(claudeDir);
        return copyMappedFiles(mappings, syncRepoDir, claudeDir, 'fromSync');
    }
}
//# sourceMappingURL=skills.js.map