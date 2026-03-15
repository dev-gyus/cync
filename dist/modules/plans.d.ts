import { SyncModule, FileMapping, CopyResult } from './base-module.js';
export declare class PlansModule implements SyncModule {
    name: string;
    description: string;
    getFiles(claudeDir: string): Promise<FileMapping[]>;
    copyToSyncRepo(claudeDir: string, syncRepoDir: string): Promise<CopyResult>;
    copyFromSyncRepo(syncRepoDir: string, claudeDir: string): Promise<CopyResult>;
}
