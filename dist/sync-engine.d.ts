export interface InitOptions {
    modules?: string[];
}
export interface PushOptions {
    modules?: string[];
    message?: string;
    dryRun?: boolean;
    force?: boolean;
}
export interface PullOptions {
    modules?: string[];
    dryRun?: boolean;
    backup?: boolean;
    keepLocal?: boolean;
}
export interface StatusResult {
    remote: string;
    branch: string;
    machineId: string;
    lastSync: string;
    modules: Array<{
        name: string;
        enabled: boolean;
        changedFiles: number;
    }>;
}
export interface SyncResult {
    moduleName: string;
    copied: string[];
    skipped: string[];
    errors: string[];
}
export declare class SyncEngine {
    private readonly claudeDir;
    constructor(claudeDir?: string);
    init(remoteUrl: string, options?: InitOptions): Promise<void>;
    push(options?: PushOptions): Promise<SyncResult[]>;
    pull(options?: PullOptions): Promise<SyncResult[]>;
    status(): Promise<StatusResult>;
    private getMachineId;
    private createBackup;
}
