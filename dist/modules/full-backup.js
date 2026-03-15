import * as path from 'path';
import { glob } from 'glob';
import { copyMappedFiles, } from './base-module.js';
/**
 * Default exclusion patterns for full backup.
 * These cover noisy/transient directories and files that should not be synced.
 */
const DEFAULT_EXCLUDE_PATTERNS = [
    '**/*.jsonl',
    'debug/**',
    'telemetry/**',
    'shell-snapshots/**',
    'file-history/**',
    '**/*.lock',
    '**/*.highwatermark',
    'paste-cache/**',
    'sessions/**',
    'statsig/**',
    'chrome/**',
    'ide/**',
    'cache/**',
    'todos/**',
    'backups/**',
    'node_modules/**',
    '.cc-sync-repo/**',
    '.cc-sync.yml',
    '.cc-sync-*',
];
export class FullBackupModule {
    name = 'full-backup';
    description = 'Full backup of ~/.claude/ with configurable exclusions';
    excludePatterns;
    constructor(excludePatterns) {
        this.excludePatterns = excludePatterns ?? DEFAULT_EXCLUDE_PATTERNS;
    }
    async getFiles(claudeDir) {
        const files = await glob('**/*', {
            cwd: claudeDir,
            nodir: true,
            dot: true,
            ignore: this.excludePatterns,
        });
        return files.map((relPath) => ({
            sourcePath: path.join(claudeDir, relPath),
            syncRepoPath: `full/${relPath}`,
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
//# sourceMappingURL=full-backup.js.map