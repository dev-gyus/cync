import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import yaml from 'js-yaml';
import {
  getDefaultConfig,
  validateConfig,
  loadConfig,
  saveConfig,
  type SyncConfig,
} from '../../src/config';

describe('getDefaultConfig', () => {
  it('returns correct default values', () => {
    const config = getDefaultConfig();

    expect(config.remote).toBe('');
    expect(config.branch).toBe('main');
    expect(config.machine_id).toBe('');
    expect(config.modules.core).toBe(true);
    expect(config.modules.skills).toBe(false);
    expect(config.modules.commands).toBe(false);
    expect(config.modules.memory).toBe(false);
    expect(config.modules.plugins).toBe(false);
    expect(config.modules.plans).toBe(false);
    expect(config.modules.full).toBe(false);
    expect(config.sensitive.encrypt).toBe(false);
  });

  it('includes all expected exclude patterns', () => {
    const config = getDefaultConfig();
    const expectedPatterns = [
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

    expect(config.sensitive.exclude).toEqual(expectedPatterns);
  });

  it('returns a new instance each call (no shared references)', () => {
    const a = getDefaultConfig();
    const b = getDefaultConfig();
    expect(a).not.toBe(b);
    expect(a.sensitive.exclude).not.toBe(b.sensitive.exclude);

    a.remote = 'modified';
    expect(b.remote).toBe('');
  });
});

describe('validateConfig', () => {
  it('accepts a valid config', () => {
    const config = getDefaultConfig();
    config.remote = 'https://github.com/user/repo.git';
    expect(validateConfig(config)).toBe(true);
  });

  it('accepts a default config (empty remote is still a string)', () => {
    const config = getDefaultConfig();
    expect(validateConfig(config)).toBe(true);
  });

  it('rejects null', () => {
    expect(validateConfig(null)).toBe(false);
  });

  it('rejects non-object', () => {
    expect(validateConfig('string')).toBe(false);
    expect(validateConfig(42)).toBe(false);
    expect(validateConfig(undefined)).toBe(false);
  });

  it('rejects config with missing remote', () => {
    const config = getDefaultConfig() as Record<string, unknown>;
    delete config.remote;
    expect(validateConfig(config)).toBe(false);
  });

  it('rejects config with non-string remote', () => {
    const config = getDefaultConfig() as Record<string, unknown>;
    config.remote = 123;
    expect(validateConfig(config)).toBe(false);
  });

  it('rejects config with non-string branch', () => {
    const config = getDefaultConfig() as Record<string, unknown>;
    config.branch = true;
    expect(validateConfig(config)).toBe(false);
  });

  it('rejects config with non-boolean module values', () => {
    const config = getDefaultConfig();
    (config.modules as Record<string, unknown>).core = 'yes';
    expect(validateConfig(config)).toBe(false);
  });

  it('rejects config with non-boolean sensitive.encrypt', () => {
    const config = getDefaultConfig();
    (config.sensitive as Record<string, unknown>).encrypt = 'true';
    expect(validateConfig(config)).toBe(false);
  });

  it('rejects config with non-array sensitive.exclude', () => {
    const config = getDefaultConfig();
    (config.sensitive as Record<string, unknown>).exclude = 'not-an-array';
    expect(validateConfig(config)).toBe(false);
  });

  it('rejects config with non-string items in sensitive.exclude', () => {
    const config = getDefaultConfig();
    (config.sensitive.exclude as unknown[]).push(123);
    expect(validateConfig(config)).toBe(false);
  });

  it('rejects config with missing modules object', () => {
    const config = getDefaultConfig() as Record<string, unknown>;
    delete config.modules;
    expect(validateConfig(config)).toBe(false);
  });

  it('rejects config with missing sensitive object', () => {
    const config = getDefaultConfig() as Record<string, unknown>;
    delete config.sensitive;
    expect(validateConfig(config)).toBe(false);
  });
});

describe('loadConfig', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'cc-sync-config-test-'));
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it('returns defaults when config file does not exist', async () => {
    const config = await loadConfig(tmpDir);
    const defaults = getDefaultConfig();
    expect(config).toEqual(defaults);
  });

  it('loads and merges with defaults', async () => {
    const partial = {
      remote: 'https://github.com/user/repo.git',
      modules: {
        skills: true,
      },
    };
    await writeFile(
      join(tmpDir, '.cc-sync.yml'),
      yaml.dump(partial),
      'utf-8',
    );

    const config = await loadConfig(tmpDir);
    expect(config.remote).toBe('https://github.com/user/repo.git');
    expect(config.branch).toBe('main'); // default
    expect(config.modules.skills).toBe(true); // from file
    expect(config.modules.core).toBe(true); // default
    expect(config.modules.commands).toBe(false); // default
  });

  it('uses defaults for invalid types in partial config', async () => {
    const invalid = {
      remote: 123, // wrong type
      branch: true, // wrong type
    };
    await writeFile(
      join(tmpDir, '.cc-sync.yml'),
      yaml.dump(invalid),
      'utf-8',
    );

    const config = await loadConfig(tmpDir);
    expect(config.remote).toBe(''); // falls back to default
    expect(config.branch).toBe('main'); // falls back to default
  });

  it('throws on malformed YAML', async () => {
    await writeFile(
      join(tmpDir, '.cc-sync.yml'),
      '{{{{invalid yaml!!!!',
      'utf-8',
    );

    await expect(loadConfig(tmpDir)).rejects.toThrow();
  });
});

describe('saveConfig', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'cc-sync-config-save-'));
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it('writes valid YAML that can be loaded back', async () => {
    const config: SyncConfig = {
      remote: 'https://github.com/user/repo.git',
      branch: 'main',
      modules: {
        core: true,
        skills: true,
        commands: false,
        memory: false,
        plugins: false,
        plans: false,
        full: false,
      },
      sensitive: {
        encrypt: false,
        exclude: ['*.jsonl'],
      },
      machine_id: 'test-machine',
    };

    await saveConfig(tmpDir, config);

    const content = await readFile(join(tmpDir, '.cc-sync.yml'), 'utf-8');
    const parsed = yaml.load(content) as Record<string, unknown>;

    expect(parsed.remote).toBe('https://github.com/user/repo.git');
    expect(parsed.branch).toBe('main');
    expect(parsed.machine_id).toBe('test-machine');
  });

  it('produces a config that passes validation after roundtrip', async () => {
    const config = getDefaultConfig();
    config.remote = 'git@github.com:user/repo.git';
    config.machine_id = 'my-laptop';

    await saveConfig(tmpDir, config);
    const loaded = await loadConfig(tmpDir);

    expect(validateConfig(loaded)).toBe(true);
    expect(loaded.remote).toBe('git@github.com:user/repo.git');
    expect(loaded.machine_id).toBe('my-laptop');
  });
});
