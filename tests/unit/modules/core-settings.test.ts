import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, writeFile, readFile, rm, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { existsSync } from 'node:fs';
import { CoreSettingsModule } from '../../../src/modules/core-settings';

describe('CoreSettingsModule', () => {
  let mockClaudeDir: string;
  let syncRepoDir: string;
  let mod: CoreSettingsModule;

  beforeEach(async () => {
    mockClaudeDir = await mkdtemp(join(tmpdir(), 'cc-core-claude-'));
    syncRepoDir = await mkdtemp(join(tmpdir(), 'cc-core-sync-'));
    mod = new CoreSettingsModule();
  });

  afterEach(async () => {
    await rm(mockClaudeDir, { recursive: true, force: true });
    await rm(syncRepoDir, { recursive: true, force: true });
  });

  describe('module metadata', () => {
    it('has correct name', () => {
      expect(mod.name).toBe('core-settings');
    });

    it('has a description', () => {
      expect(mod.description).toBeTruthy();
    });
  });

  describe('getFiles', () => {
    it('returns only files that exist in the directory', async () => {
      // Create only CLAUDE.md and settings.json
      await writeFile(join(mockClaudeDir, 'CLAUDE.md'), '# Test', 'utf-8');
      await writeFile(
        join(mockClaudeDir, 'settings.json'),
        '{"test": true}',
        'utf-8',
      );

      const files = await mod.getFiles(mockClaudeDir);

      expect(files).toHaveLength(2);
      const syncPaths = files.map((f) => f.syncRepoPath);
      expect(syncPaths).toContain('core/CLAUDE.md');
      expect(syncPaths).toContain('core/settings.json');
    });

    it('maps files to core/ prefix', async () => {
      await writeFile(join(mockClaudeDir, 'CLAUDE.md'), '# Test', 'utf-8');
      await writeFile(join(mockClaudeDir, 'COMMANDS.md'), '# Cmds', 'utf-8');
      await writeFile(join(mockClaudeDir, 'FLAGS.md'), '# Flags', 'utf-8');

      const files = await mod.getFiles(mockClaudeDir);

      for (const file of files) {
        expect(file.syncRepoPath).toMatch(/^core\//);
      }
    });

    it('returns empty array when no core files exist', async () => {
      const files = await mod.getFiles(mockClaudeDir);
      expect(files).toEqual([]);
    });

    it('includes all recognized core files when present', async () => {
      const coreFileNames = [
        'CLAUDE.md',
        'COMMANDS.md',
        'FLAGS.md',
        'PRINCIPLES.md',
        'RULES.md',
        'MCP.md',
        'PERSONAS.md',
        'ORCHESTRATOR.md',
        'MODES.md',
        'settings.json',
        'settings.local.json',
        '.superclaude-metadata.json',
      ];

      for (const name of coreFileNames) {
        await writeFile(join(mockClaudeDir, name), `content of ${name}`, 'utf-8');
      }

      const files = await mod.getFiles(mockClaudeDir);
      expect(files).toHaveLength(coreFileNames.length);
    });

    it('sets sourcePath to absolute path in claude dir', async () => {
      await writeFile(join(mockClaudeDir, 'CLAUDE.md'), '# Test', 'utf-8');

      const files = await mod.getFiles(mockClaudeDir);
      expect(files[0]!.sourcePath).toBe(join(mockClaudeDir, 'CLAUDE.md'));
    });
  });

  describe('copyToSyncRepo', () => {
    it('copies files to sync repo under core/ prefix', async () => {
      await writeFile(
        join(mockClaudeDir, 'CLAUDE.md'),
        '# My CLAUDE.md',
        'utf-8',
      );
      await writeFile(
        join(mockClaudeDir, 'settings.json'),
        '{"enabled": true}',
        'utf-8',
      );

      const result = await mod.copyToSyncRepo(mockClaudeDir, syncRepoDir);

      expect(result.copied).toContain('core/CLAUDE.md');
      expect(result.copied).toContain('core/settings.json');
      expect(result.errors).toEqual([]);

      const content = await readFile(
        join(syncRepoDir, 'core/CLAUDE.md'),
        'utf-8',
      );
      expect(content).toBe('# My CLAUDE.md');
    });

    it('creates core/ directory in sync repo', async () => {
      await writeFile(join(mockClaudeDir, 'CLAUDE.md'), '# Test', 'utf-8');

      await mod.copyToSyncRepo(mockClaudeDir, syncRepoDir);

      expect(existsSync(join(syncRepoDir, 'core'))).toBe(true);
    });
  });

  describe('copyFromSyncRepo', () => {
    it('copies files back from sync repo to claude dir', async () => {
      // First set up files in claude dir (getFiles needs them to create mappings)
      await writeFile(join(mockClaudeDir, 'CLAUDE.md'), '# Old content', 'utf-8');

      // Then set up the sync repo source with new content
      await mkdir(join(syncRepoDir, 'core'), { recursive: true });
      await writeFile(
        join(syncRepoDir, 'core/CLAUDE.md'),
        '# Updated content',
        'utf-8',
      );

      const result = await mod.copyFromSyncRepo(syncRepoDir, mockClaudeDir);

      expect(result.copied).toContain('core/CLAUDE.md');

      const content = await readFile(join(mockClaudeDir, 'CLAUDE.md'), 'utf-8');
      expect(content).toBe('# Updated content');
    });

    it('skips files that do not exist in sync repo', async () => {
      // Create a file in claude dir but NOT in sync repo
      await writeFile(join(mockClaudeDir, 'CLAUDE.md'), '# Local only', 'utf-8');

      const result = await mod.copyFromSyncRepo(syncRepoDir, mockClaudeDir);

      // The source (sync repo) doesn't have core/CLAUDE.md, so it should be skipped
      expect(result.skipped).toContain(join(syncRepoDir, 'core/CLAUDE.md'));
      expect(result.copied).toEqual([]);
    });
  });
});
