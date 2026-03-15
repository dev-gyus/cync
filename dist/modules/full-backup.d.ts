import { SyncModule, FileMapping, CopyResult } from './base-module.js';
export declare class FullBackupModule implements SyncModule {
    name: string;
    description: string;
    private excludePatterns;
    constructor(excludePatterns?: string[]);
    getFiles(claudeDir: string): Promise<FileMapping[]>;
    copyToSyncRepo(claudeDir: string, syncRepoDir: string): Promise<CopyResult>;
    copyFromSyncRepo(syncRepoDir: string, claudeDir: string): Promise<CopyResult>;
}
