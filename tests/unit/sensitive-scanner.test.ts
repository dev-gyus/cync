import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { redactLine, scanFile, scanFiles } from '../../src/utils/sensitive-scanner';

describe('sensitive pattern detection', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'cc-scan-'));
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it('detects API keys', async () => {
    const filePath = join(tmpDir, 'config.txt');
    await writeFile(filePath, 'api_key: "sk-abc123456789012345678901"', 'utf-8');

    const matches = await scanFile(filePath);
    expect(matches.length).toBeGreaterThanOrEqual(1);

    const apiKeyMatch = matches.find((m) => m.pattern === 'API Key' || m.pattern === 'OpenAI/Anthropic Key');
    expect(apiKeyMatch).toBeDefined();
  });

  it('detects GitHub tokens', async () => {
    const filePath = join(tmpDir, 'tokens.txt');
    await writeFile(
      filePath,
      'GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
      'utf-8',
    );

    const matches = await scanFile(filePath);
    const ghMatch = matches.find((m) => m.pattern === 'GitHub Token');
    expect(ghMatch).toBeDefined();
    expect(ghMatch!.line).toBe(1);
  });

  it('detects private keys', async () => {
    const filePath = join(tmpDir, 'key.pem');
    await writeFile(
      filePath,
      '-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----',
      'utf-8',
    );

    const matches = await scanFile(filePath);
    const pkMatch = matches.find((m) => m.pattern === 'Private Key');
    expect(pkMatch).toBeDefined();
  });

  it('detects RSA private keys', async () => {
    const filePath = join(tmpDir, 'rsa.pem');
    await writeFile(
      filePath,
      '-----BEGIN RSA PRIVATE KEY-----\nMIIE...\n-----END RSA PRIVATE KEY-----',
      'utf-8',
    );

    const matches = await scanFile(filePath);
    const pkMatch = matches.find((m) => m.pattern === 'Private Key');
    expect(pkMatch).toBeDefined();
  });

  it('detects passwords', async () => {
    const filePath = join(tmpDir, 'env.txt');
    await writeFile(filePath, 'password: "supersecret123"', 'utf-8');

    const matches = await scanFile(filePath);
    const pwMatch = matches.find((m) => m.pattern === 'Password');
    expect(pwMatch).toBeDefined();
  });

  it('detects secrets', async () => {
    const filePath = join(tmpDir, 'secrets.txt');
    await writeFile(filePath, 'secret = "my-very-secret-value"', 'utf-8');

    const matches = await scanFile(filePath);
    const secretMatch = matches.find((m) => m.pattern === 'Secret');
    expect(secretMatch).toBeDefined();
  });

  it('detects OpenAI/Anthropic keys (sk- pattern)', async () => {
    const filePath = join(tmpDir, 'keys.txt');
    await writeFile(filePath, 'sk-abcdefghijklmnopqrstuvwxyz1234', 'utf-8');

    const matches = await scanFile(filePath);
    const skMatch = matches.find((m) => m.pattern === 'OpenAI/Anthropic Key');
    expect(skMatch).toBeDefined();
  });

  it('does NOT flag normal text', async () => {
    const filePath = join(tmpDir, 'normal.md');
    await writeFile(
      filePath,
      [
        '# My Configuration',
        '',
        'This is a normal markdown file.',
        'It contains no sensitive data.',
        'The API documentation can be found at https://docs.example.com',
        '',
        '## Setup Instructions',
        '1. Clone the repository',
        '2. Run npm install',
        '3. Start the server',
      ].join('\n'),
      'utf-8',
    );

    const matches = await scanFile(filePath);
    expect(matches).toHaveLength(0);
  });
});

describe('redactLine', () => {
  it('properly redacts sensitive values', () => {
    const line = 'api_key: "sk-abc123456789012345678901"';
    const match = line.match(/api[_-]?key\s*[:=]\s*["'][^"']+/i)!;
    const redacted = redactLine(line, match);

    expect(redacted).toContain('***REDACTED***');
    expect(redacted).not.toContain('sk-abc123456789012345678901');
  });

  it('returns original line when match has no index', () => {
    const line = 'some text';
    // Create a match-like object without index
    const fakeMatch = ['some'] as RegExpMatchArray;
    // index is undefined by default for manually constructed arrays
    const result = redactLine(line, fakeMatch);
    expect(result).toBe('some text');
  });

  it('handles match at the beginning of line', () => {
    const line = 'secret = "mysecretvalue" extra text';
    const match = line.match(/secret\s*[:=]\s*["'][^"']+/i)!;
    const redacted = redactLine(line, match);

    expect(redacted).toContain('***REDACTED***');
    expect(redacted).not.toContain('mysecretvalue');
  });
});

describe('scanFiles', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'cc-scanfiles-'));
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it('returns only files with matches', async () => {
    const sensitiveFile = join(tmpDir, 'secrets.txt');
    const normalFile = join(tmpDir, 'readme.md');

    await writeFile(sensitiveFile, 'api_key: "sk-test1234567890123456"', 'utf-8');
    await writeFile(normalFile, '# Just a readme', 'utf-8');

    const results = await scanFiles([sensitiveFile, normalFile]);

    expect(results).toHaveLength(1);
    expect(results[0]!.file).toBe(sensitiveFile);
    expect(results[0]!.matches.length).toBeGreaterThanOrEqual(1);
  });

  it('returns empty array when no files have matches', async () => {
    const file1 = join(tmpDir, 'clean1.md');
    const file2 = join(tmpDir, 'clean2.md');

    await writeFile(file1, '# Clean file 1', 'utf-8');
    await writeFile(file2, '# Clean file 2', 'utf-8');

    const results = await scanFiles([file1, file2]);
    expect(results).toEqual([]);
  });

  it('skips files that cannot be read', async () => {
    const realFile = join(tmpDir, 'real.md');
    const missingFile = join(tmpDir, 'does-not-exist.txt');

    await writeFile(realFile, '# No secrets here', 'utf-8');

    // Should not throw even though one file is missing
    const results = await scanFiles([realFile, missingFile]);
    expect(results).toEqual([]);
  });

  it('handles multiple sensitive files', async () => {
    const file1 = join(tmpDir, 'a.txt');
    const file2 = join(tmpDir, 'b.txt');

    await writeFile(file1, 'api_key: "key1234567890123456789"', 'utf-8');
    await writeFile(file2, 'password: "hunter2"', 'utf-8');

    const results = await scanFiles([file1, file2]);
    expect(results).toHaveLength(2);
  });
});
