export interface FileMapping {
    sourcePath: string;
    syncRepoPath: string;
}
export interface CopyResult {
    copied: string[];
    skipped: string[];
    errors: string[];
}
export interface SyncModule {
    name: string;
    description: string;
    getFiles(claudeDir: string): Promise<FileMapping[]>;
    copyToSyncRepo(claudeDir: string, syncRepoDir: string): Promise<CopyResult>;
    copyFromSyncRepo(syncRepoDir: string, claudeDir: string): Promise<CopyResult>;
}
/**
 * Check whether a file or directory exists at the given path.
 */
export declare function fileExists(filePath: string): Promise<boolean>;
/**
 * Copy files described by a set of mappings.
 *
 * @param mappings  - Array of FileMapping objects produced by a module's getFiles().
 * @param sourceBase - When direction is 'toSync' this is claudeDir; otherwise syncRepoDir.
 * @param targetBase - When direction is 'toSync' this is syncRepoDir; otherwise claudeDir.
 * @param direction  - 'toSync' copies sourcePath -> syncRepoPath under targetBase.
 *                     'fromSync' copies syncRepoPath under sourceBase -> sourcePath.
 */
export declare function copyMappedFiles(mappings: FileMapping[], sourceBase: string, targetBase: string, direction: 'toSync' | 'fromSync'): Promise<CopyResult>;
