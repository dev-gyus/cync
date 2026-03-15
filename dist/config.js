import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';
import yaml from 'js-yaml';
const CONFIG_FILENAME = '.cc-sync.yml';
const DEFAULT_EXCLUDE_PATTERNS = [
    '*.jsonl',
    'debug/',
    'telemetry/',
    'shell-snapshots/',
    'file-history/',
    '*.lock',
    '*.highwatermark',
    'paste-cache/',
    'sessions/',
    'statsig/',
    'chrome/',
    'ide/',
    'cache/',
    'todos/',
    'backups/',
];
/**
 * Return the default configuration with sensible defaults.
 */
export function getDefaultConfig() {
    return {
        remote: '',
        branch: 'main',
        modules: {
            core: true,
            skills: false,
            commands: false,
            memory: false,
            plugins: false,
            plans: false,
            full: false,
        },
        sensitive: {
            encrypt: false,
            exclude: [...DEFAULT_EXCLUDE_PATTERNS],
        },
        machine_id: '',
    };
}
/**
 * Runtime validation for a SyncConfig object.
 * Returns true (and narrows the type) if the value matches the expected shape.
 */
export function validateConfig(config) {
    if (typeof config !== 'object' || config === null)
        return false;
    const c = config;
    if (typeof c.remote !== 'string')
        return false;
    if (typeof c.branch !== 'string')
        return false;
    if (typeof c.machine_id !== 'string')
        return false;
    // Validate modules
    if (typeof c.modules !== 'object' || c.modules === null)
        return false;
    const modules = c.modules;
    const moduleKeys = ['core', 'skills', 'commands', 'memory', 'plugins', 'plans', 'full'];
    for (const key of moduleKeys) {
        if (typeof modules[key] !== 'boolean')
            return false;
    }
    // Validate sensitive
    if (typeof c.sensitive !== 'object' || c.sensitive === null)
        return false;
    const sensitive = c.sensitive;
    if (typeof sensitive.encrypt !== 'boolean')
        return false;
    if (!Array.isArray(sensitive.exclude))
        return false;
    for (const item of sensitive.exclude) {
        if (typeof item !== 'string')
            return false;
    }
    return true;
}
/**
 * Load and parse .cc-sync.yml from the given Claude directory.
 * Missing fields are filled in from the default config.
 */
export async function loadConfig(claudeDir) {
    const configPath = join(claudeDir, CONFIG_FILENAME);
    const defaults = getDefaultConfig();
    let raw;
    try {
        const content = await readFile(configPath, 'utf-8');
        raw = yaml.load(content) ?? {};
    }
    catch (err) {
        const error = err;
        if (error.code === 'ENOENT') {
            // Config file doesn't exist yet; return defaults
            return defaults;
        }
        throw new Error(`Failed to read config at ${configPath}: ${error.message}`);
    }
    // Deep merge with defaults
    const rawModules = (raw.modules ?? {});
    const rawSensitive = (raw.sensitive ?? {});
    const merged = {
        remote: typeof raw.remote === 'string' ? raw.remote : defaults.remote,
        branch: typeof raw.branch === 'string' ? raw.branch : defaults.branch,
        machine_id: typeof raw.machine_id === 'string' ? raw.machine_id : defaults.machine_id,
        modules: {
            core: typeof rawModules.core === 'boolean' ? rawModules.core : defaults.modules.core,
            skills: typeof rawModules.skills === 'boolean' ? rawModules.skills : defaults.modules.skills,
            commands: typeof rawModules.commands === 'boolean' ? rawModules.commands : defaults.modules.commands,
            memory: typeof rawModules.memory === 'boolean' ? rawModules.memory : defaults.modules.memory,
            plugins: typeof rawModules.plugins === 'boolean' ? rawModules.plugins : defaults.modules.plugins,
            plans: typeof rawModules.plans === 'boolean' ? rawModules.plans : defaults.modules.plans,
            full: typeof rawModules.full === 'boolean' ? rawModules.full : defaults.modules.full,
        },
        sensitive: {
            encrypt: typeof rawSensitive.encrypt === 'boolean'
                ? rawSensitive.encrypt
                : defaults.sensitive.encrypt,
            exclude: Array.isArray(rawSensitive.exclude)
                ? rawSensitive.exclude
                : defaults.sensitive.exclude,
        },
    };
    return merged;
}
/**
 * Serialize and write the config to .cc-sync.yml in the Claude directory.
 */
export async function saveConfig(claudeDir, config) {
    const configPath = join(claudeDir, CONFIG_FILENAME);
    const content = yaml.dump(config, {
        indent: 2,
        lineWidth: 120,
        noRefs: true,
    });
    await writeFile(configPath, content, 'utf-8');
}
/**
 * Returns the path to the user's ~/.claude/ directory.
 */
export function getClaudeDir() {
    return join(homedir(), '.claude');
}
/**
 * Returns the path to the sync repo directory inside the Claude directory.
 */
export function getSyncRepoDir(claudeDir) {
    return join(claudeDir, '.cc-sync-repo');
}
//# sourceMappingURL=config.js.map