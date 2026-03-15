import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { existsSync } from 'node:fs';

import {
  loadConfig,
  saveConfig,
  getDefaultConfig,
  getClaudeDir,
  getSyncRepoDir,
  type SyncConfig,
} from './config.js';
import {
  isGitInstalled,
  gitClone,
  gitInit,
  gitAddRemote,
  gitPull,
  gitPush,
  gitAdd,
  gitCommit,
  gitStatus,
} from './utils/git.js';
import {
  getEnabledModules,
  getAllModules,
  getModule,
  type SyncModule,
} from './modules/index.js';
import { scanFiles } from './utils/sensitive-scanner.js';
import * as logger from './utils/logger.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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

interface SyncMeta {
  lastSync: string;
  machineId: string;
  modules: string[];
  version: string;
}

// ---------------------------------------------------------------------------
// Config-key ↔ module-name mapping
//
// The SyncConfig uses short keys (e.g. "core", "full") whereas the module
// registry uses descriptive names ("core-settings", "full-backup").  The
// helpers below translate between the two worlds.
// ---------------------------------------------------------------------------

const CONFIG_KEY_TO_MODULE_NAME: Record<string, string> = {
  core: 'core-settings',
  full: 'full-backup',
  // All other keys match their module names 1:1
  skills: 'skills',
  commands: 'commands',
  memory: 'memory',
  plugins: 'plugins',
  plans: 'plans',
};

const MODULE_NAME_TO_CONFIG_KEY: Record<string, string> = {};
for (const [key, mod] of Object.entries(CONFIG_KEY_TO_MODULE_NAME)) {
  MODULE_NAME_TO_CONFIG_KEY[mod] = key;
}

/**
 * Translate the compact config-key module map into a map keyed by the real
 * module names so it can be fed directly to `getEnabledModules()`.
 */
function expandModuleConfig(
  configModules: Record<string, boolean>,
): Record<string, boolean> {
  const expanded: Record<string, boolean> = {};
  for (const [key, enabled] of Object.entries(configModules)) {
    const moduleName = CONFIG_KEY_TO_MODULE_NAME[key] ?? key;
    expanded[moduleName] = enabled;
  }
  return expanded;
}

/**
 * Given an array of user-supplied module identifiers (which may be config keys
 * **or** full module names) return the resolved SyncModule instances.
 */
function resolveModules(names: string[]): SyncModule[] {
  const resolved: SyncModule[] = [];
  for (const name of names) {
    // Try the name directly first, then try mapping from config key
    const moduleName = CONFIG_KEY_TO_MODULE_NAME[name] ?? name;
    const mod = getModule(moduleName);
    if (mod) {
      resolved.push(mod);
    } else {
      logger.warn(`Unknown module: ${name}`);
    }
  }
  return resolved;
}

// ---------------------------------------------------------------------------
// SyncEngine
// ---------------------------------------------------------------------------

export class SyncEngine {
  private readonly claudeDir: string;

  constructor(claudeDir?: string) {
    this.claudeDir = claudeDir ?? getClaudeDir();
  }

  // -----------------------------------------------------------------------
  // init
  // -----------------------------------------------------------------------

  async init(remoteUrl: string, options?: InitOptions): Promise<void> {
    if (!isGitInstalled()) {
      throw new Error(
        'Git is not installed or not found on PATH. Please install git first.',
      );
    }

    const syncRepoDir = getSyncRepoDir(this.claudeDir);

    // Clone or init the sync repo
    if (existsSync(syncRepoDir)) {
      logger.info('Sync repo already exists, pulling latest changes...');
      try {
        gitPull(syncRepoDir);
      } catch {
        logger.warn('Could not pull (remote may not exist yet). Continuing.');
      }
    } else {
      logger.info(`Cloning sync repo from ${remoteUrl}...`);
      try {
        gitClone(remoteUrl, syncRepoDir);
        logger.success('Repository cloned successfully.');
      } catch {
        logger.info(
          'Clone failed (empty repo?). Initialising a new local repo.',
        );
        await mkdir(syncRepoDir, { recursive: true });
        gitInit(syncRepoDir);
        gitAddRemote(syncRepoDir, 'origin', remoteUrl);
      }
    }

    // Determine which modules to enable
    const enabledModuleKeys = options?.modules ?? [
      'core',
      'skills',
      'commands',
    ];

    // Build config
    const config: SyncConfig = getDefaultConfig();
    config.remote = remoteUrl;
    config.machine_id = this.getMachineId();

    for (const key of enabledModuleKeys) {
      const configKey = key as keyof SyncConfig['modules'];
      if (configKey in config.modules) {
        config.modules[configKey] = true;
      }
    }

    await saveConfig(this.claudeDir, config);
    logger.success('Configuration saved.');
    logger.info(
      `Enabled modules: ${enabledModuleKeys.join(', ')}`,
    );
  }

  // -----------------------------------------------------------------------
  // push
  // -----------------------------------------------------------------------

  async push(options?: PushOptions): Promise<SyncResult[]> {
    const config = await loadConfig(this.claudeDir);
    const syncRepoDir = getSyncRepoDir(this.claudeDir);

    // Resolve modules
    const modules = options?.modules
      ? resolveModules(options.modules)
      : getEnabledModules(expandModuleConfig(config.modules as unknown as Record<string, boolean>));

    if (modules.length === 0) {
      logger.warn('No modules selected for push.');
      return [];
    }

    // 1. Collect files from all modules for sensitive scanning
    const allSourceFiles: string[] = [];
    for (const mod of modules) {
      const files = await mod.getFiles(this.claudeDir);
      for (const f of files) {
        allSourceFiles.push(f.sourcePath);
      }
    }

    // 2. Scan for sensitive data
    const scanResults = await scanFiles(allSourceFiles);
    if (scanResults.length > 0) {
      logger.warn('Sensitive data detected in the following files:');
      for (const result of scanResults) {
        for (const match of result.matches) {
          logger.warn(
            `  ${result.file}:${match.line} [${match.pattern}] ${match.preview}`,
          );
        }
      }
    }

    // 3. Dry-run: log what would change and return
    if (options?.dryRun) {
      logger.info('[DRY RUN] The following modules would be pushed:');
      const results: SyncResult[] = [];
      for (const mod of modules) {
        const files = await mod.getFiles(this.claudeDir);
        logger.info(`  ${mod.name}: ${files.length} file(s)`);
        for (const f of files) {
          logger.info(`    ${f.syncRepoPath}`);
        }
        results.push({
          moduleName: mod.name,
          copied: files.map((f) => f.syncRepoPath),
          skipped: [],
          errors: [],
        });
      }
      return results;
    }

    // 4. Copy files to sync repo
    const results: SyncResult[] = [];
    for (const mod of modules) {
      logger.info(`Copying ${mod.name}...`);
      const copyResult = await mod.copyToSyncRepo(this.claudeDir, syncRepoDir);
      results.push({
        moduleName: mod.name,
        copied: copyResult.copied,
        skipped: copyResult.skipped,
        errors: copyResult.errors,
      });

      if (copyResult.copied.length > 0) {
        logger.success(
          `  ${mod.name}: ${copyResult.copied.length} file(s) copied`,
        );
      }
      if (copyResult.errors.length > 0) {
        for (const err of copyResult.errors) {
          logger.error(`  ${mod.name}: ${err}`);
        }
      }
    }

    // 5. Update .cc-sync-meta.json
    const meta: SyncMeta = {
      lastSync: new Date().toISOString(),
      machineId: config.machine_id || this.getMachineId(),
      modules: modules.map((m) => m.name),
      version: '1.0.0',
    };
    await writeFile(
      join(syncRepoDir, '.cc-sync-meta.json'),
      JSON.stringify(meta, null, 2),
      'utf-8',
    );

    // 6. Git add, commit, push
    const status = gitStatus(syncRepoDir);
    if (!status) {
      logger.info('No changes to commit.');
      return results;
    }

    gitAdd(syncRepoDir);

    const moduleNames = modules.map((m) => m.name).join(', ');
    const machineId = config.machine_id || this.getMachineId();
    const commitMessage =
      options?.message ??
      `sync: ${moduleNames} from ${machineId} at ${new Date().toISOString()}`;

    gitCommit(syncRepoDir, commitMessage);
    logger.success('Changes committed.');

    try {
      gitPush(syncRepoDir, options?.force);
      logger.success('Pushed to remote.');
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error(`Push failed: ${message}`);
      if (!options?.force) {
        logger.info('Hint: use --force to force push.');
      }
    }

    return results;
  }

  // -----------------------------------------------------------------------
  // pull
  // -----------------------------------------------------------------------

  async pull(options?: PullOptions): Promise<SyncResult[]> {
    const config = await loadConfig(this.claudeDir);
    const syncRepoDir = getSyncRepoDir(this.claudeDir);

    // 1. Git pull
    logger.info('Pulling latest changes from remote...');
    try {
      gitPull(syncRepoDir);
      logger.success('Pull complete.');
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error(`Pull failed: ${message}`);
      throw err;
    }

    // 2. Resolve modules
    const modules = options?.modules
      ? resolveModules(options.modules)
      : getEnabledModules(expandModuleConfig(config.modules as unknown as Record<string, boolean>));

    if (modules.length === 0) {
      logger.warn('No modules selected for pull.');
      return [];
    }

    // 3. Backup if requested
    if (options?.backup) {
      await this.createBackup(modules);
    }

    // 4. Dry-run: compare and log
    if (options?.dryRun) {
      logger.info('[DRY RUN] The following modules would be pulled:');
      const results: SyncResult[] = [];
      for (const mod of modules) {
        const files = await mod.getFiles(this.claudeDir);
        logger.info(`  ${mod.name}: ${files.length} file(s)`);
        for (const f of files) {
          logger.info(`    ${f.syncRepoPath}`);
        }
        results.push({
          moduleName: mod.name,
          copied: files.map((f) => f.syncRepoPath),
          skipped: [],
          errors: [],
        });
      }
      return results;
    }

    // 5. Copy files from sync repo
    const results: SyncResult[] = [];
    for (const mod of modules) {
      logger.info(`Restoring ${mod.name}...`);
      const copyResult = await mod.copyFromSyncRepo(syncRepoDir, this.claudeDir);
      results.push({
        moduleName: mod.name,
        copied: copyResult.copied,
        skipped: copyResult.skipped,
        errors: copyResult.errors,
      });

      if (copyResult.copied.length > 0) {
        logger.success(
          `  ${mod.name}: ${copyResult.copied.length} file(s) restored`,
        );
      }
      if (copyResult.errors.length > 0) {
        for (const err of copyResult.errors) {
          logger.error(`  ${mod.name}: ${err}`);
        }
      }
    }

    return results;
  }

  // -----------------------------------------------------------------------
  // status
  // -----------------------------------------------------------------------

  async status(): Promise<StatusResult> {
    const config = await loadConfig(this.claudeDir);
    const syncRepoDir = getSyncRepoDir(this.claudeDir);
    const expandedConfig = expandModuleConfig(
      config.modules as unknown as Record<string, boolean>,
    );

    // Read last sync meta
    let lastSync = 'never';
    try {
      const metaRaw = await readFile(
        join(syncRepoDir, '.cc-sync-meta.json'),
        'utf-8',
      );
      const meta = JSON.parse(metaRaw) as SyncMeta;
      lastSync = meta.lastSync;
    } catch {
      // No meta file yet
    }

    // Evaluate every module (enabled and disabled)
    const allModules = getAllModules();
    const moduleStatuses: StatusResult['modules'] = [];

    for (const mod of allModules) {
      const enabled = expandedConfig[mod.name] === true;
      let changedFiles = 0;

      try {
        const files = await mod.getFiles(this.claudeDir);
        // Count files that exist at source but differ from sync repo copy
        for (const f of files) {
          const syncPath = join(syncRepoDir, f.syncRepoPath);
          const sourceExists = existsSync(f.sourcePath);
          const syncExists = existsSync(syncPath);

          if (sourceExists && !syncExists) {
            changedFiles++;
          } else if (sourceExists && syncExists) {
            try {
              const [srcBuf, syncBuf] = await Promise.all([
                readFile(f.sourcePath),
                readFile(syncPath),
              ]);
              if (!srcBuf.equals(syncBuf)) {
                changedFiles++;
              }
            } catch {
              changedFiles++;
            }
          }
        }
      } catch {
        // Module getFiles failed; treat as 0 changed
      }

      moduleStatuses.push({
        name: mod.name,
        enabled,
        changedFiles,
      });
    }

    return {
      remote: config.remote,
      branch: config.branch,
      machineId: config.machine_id,
      lastSync,
      modules: moduleStatuses,
    };
  }

  // -----------------------------------------------------------------------
  // Private helpers
  // -----------------------------------------------------------------------

  private getMachineId(): string {
    const { hostname } = await_import_os();
    return hostname;
  }

  private async createBackup(modules: SyncModule[]): Promise<void> {
    const backupDir = join(this.claudeDir, 'backups');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = join(backupDir, `backup-${timestamp}`);

    await mkdir(backupPath, { recursive: true });

    for (const mod of modules) {
      const files = await mod.getFiles(this.claudeDir);
      for (const f of files) {
        if (existsSync(f.sourcePath)) {
          const dest = join(backupPath, f.syncRepoPath);
          await mkdir(join(dest, '..'), { recursive: true });
          const { copyFile } = await import('node:fs/promises');
          await copyFile(f.sourcePath, dest);
        }
      }
    }

    logger.success(`Backup created at ${backupPath}`);
  }
}

// Small helper to get hostname synchronously without top-level await
function await_import_os(): { hostname: string } {
  // os is a built-in module and can be imported synchronously via require-like trick
  // but since we're in ESM we use the dynamic approach cached at module level.
  return { hostname: _hostname };
}

import { hostname as _getHostname } from 'node:os';
const _hostname = _getHostname();
