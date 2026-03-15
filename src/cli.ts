#!/usr/bin/env node

import { Command } from 'commander';
import { SyncEngine } from './sync-engine.js';
import * as logger from './utils/logger.js';

const program = new Command();

program
  .name('claude-code-sync')
  .description('Backup and sync your Claude Code settings to the cloud via Git')
  .version('1.0.0');

// -------------------------------------------------------------------------
// init
// -------------------------------------------------------------------------

program
  .command('init')
  .description('Initialize sync with a remote Git repository')
  .argument('<remote-url>', 'Git remote URL to sync with')
  .option(
    '-m, --module <modules>',
    'Comma-separated list of modules to enable',
    'core,skills,commands',
  )
  .action(async (remoteUrl: string, opts: { module: string }) => {
    try {
      const engine = new SyncEngine();
      const modules = opts.module.split(',').map((m) => m.trim());
      await engine.init(remoteUrl, { modules });
    } catch (err) {
      logger.error(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });

// -------------------------------------------------------------------------
// push
// -------------------------------------------------------------------------

program
  .command('push')
  .description('Push local Claude Code settings to the remote sync repo')
  .option('-m, --module <modules>', 'Comma-separated list of modules to push')
  .option('--message <message>', 'Custom commit message')
  .option('--dry-run', 'Preview changes without pushing')
  .option('--force', 'Force push to remote')
  .action(
    async (opts: {
      module?: string;
      message?: string;
      dryRun?: boolean;
      force?: boolean;
    }) => {
      try {
        const engine = new SyncEngine();
        const results = await engine.push({
          modules: opts.module
            ? opts.module.split(',').map((m) => m.trim())
            : undefined,
          message: opts.message,
          dryRun: opts.dryRun,
          force: opts.force,
        });

        logger.divider();
        for (const r of results) {
          logger.info(
            `${r.moduleName}: ${r.copied.length} copied, ${r.skipped.length} skipped, ${r.errors.length} errors`,
          );
        }
      } catch (err) {
        logger.error(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    },
  );

// -------------------------------------------------------------------------
// pull
// -------------------------------------------------------------------------

program
  .command('pull')
  .description('Pull settings from the remote sync repo to local')
  .option('-m, --module <modules>', 'Comma-separated list of modules to pull')
  .option('--dry-run', 'Preview changes without pulling')
  .option('--backup', 'Create a backup before pulling')
  .option('--keep-local', 'Keep local files on conflict')
  .action(
    async (opts: {
      module?: string;
      dryRun?: boolean;
      backup?: boolean;
      keepLocal?: boolean;
    }) => {
      try {
        const engine = new SyncEngine();
        const results = await engine.pull({
          modules: opts.module
            ? opts.module.split(',').map((m) => m.trim())
            : undefined,
          dryRun: opts.dryRun,
          backup: opts.backup,
          keepLocal: opts.keepLocal,
        });

        logger.divider();
        for (const r of results) {
          logger.info(
            `${r.moduleName}: ${r.copied.length} restored, ${r.skipped.length} skipped, ${r.errors.length} errors`,
          );
        }
      } catch (err) {
        logger.error(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    },
  );

// -------------------------------------------------------------------------
// status
// -------------------------------------------------------------------------

program
  .command('status')
  .description('Show sync status and file changes')
  .action(async () => {
    try {
      const engine = new SyncEngine();
      const status = await engine.status();

      logger.divider();
      logger.info(`Remote:     ${status.remote || '(not configured)'}`);
      logger.info(`Branch:     ${status.branch}`);
      logger.info(`Machine ID: ${status.machineId || '(not set)'}`);
      logger.info(`Last Sync:  ${status.lastSync}`);
      logger.divider();

      const headers = ['Module', 'Enabled', 'Changed Files'];
      const rows = status.modules.map((m) => [
        m.name,
        m.enabled ? 'yes' : 'no',
        String(m.changedFiles),
      ]);

      logger.table(headers, rows);
    } catch (err) {
      logger.error(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });

program.parse();
