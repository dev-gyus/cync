export interface SyncConfig {
    remote: string;
    branch: string;
    modules: {
        core: boolean;
        skills: boolean;
        commands: boolean;
        memory: boolean;
        plugins: boolean;
        plans: boolean;
        full: boolean;
    };
    sensitive: {
        encrypt: boolean;
        exclude: string[];
    };
    machine_id: string;
}
/**
 * Return the default configuration with sensible defaults.
 */
export declare function getDefaultConfig(): SyncConfig;
/**
 * Runtime validation for a SyncConfig object.
 * Returns true (and narrows the type) if the value matches the expected shape.
 */
export declare function validateConfig(config: unknown): config is SyncConfig;
/**
 * Load and parse .cc-sync.yml from the given Claude directory.
 * Missing fields are filled in from the default config.
 */
export declare function loadConfig(claudeDir: string): Promise<SyncConfig>;
/**
 * Serialize and write the config to .cc-sync.yml in the Claude directory.
 */
export declare function saveConfig(claudeDir: string, config: SyncConfig): Promise<void>;
/**
 * Returns the path to the user's ~/.claude/ directory.
 */
export declare function getClaudeDir(): string;
/**
 * Returns the path to the sync repo directory inside the Claude directory.
 */
export declare function getSyncRepoDir(claudeDir: string): string;
