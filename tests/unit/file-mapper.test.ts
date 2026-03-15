import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, writeFile, readFile, rm, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { existsSync } from 'node:fs';
import {
  copyFiles,
  compareFiles,
  ensureDir,
  type FileMapping,
} from '../../src/utils/file-mapper';

describe('copyFiles', () => {
  let srcDir: string;
  let destDir: string;

  beforeEach(async () => {
    srcDir = await mkdtemp(join(tmpdir(), 'cc-fm-src-'));
    destDir = await mkdtemp(join(tmpdir(), 'cc-fm-dest-'));
  });

  afterEach(async () => {
    await rm(srcDir, { recursive: true, force: true });
    await rm(destDir, { recursive: true, force: true });
  });

  it('copies files correctly', async () => {
    const filePath = join(srcDir, 'test.md');
    await writeFile(filePath, '# Hello World', 'utf-8');

    const mappings: FileMapping[] = [
      { sourcePath: filePath, syncRepoPath: 'core/test.md' },
    ];

    const result = await copyFiles(mappings, destDir);

    expect(result.copied).toEqual(['core/test.md']);
    expect(result.skipped).toEqual([]);
    expect(result.errors).toEqual([]);

    const destContent = await readFile(join(destDir, 'core/test.md'), 'utf-8');
    expect(destContent).toBe('# Hello World');
  });

  it('creates directories as needed', async () => {
    const filePath = join(srcDir, 'data.txt');
    await writeFile(filePath, 'some data', 'utf-8');

    const mappings: FileMapping[] = [
      { sourcePath: filePath, syncRepoPath: 'deep/nested/dir/data.txt' },
    ];

    const result = await copyFiles(mappings, destDir);

    expect(result.copied).toEqual(['deep/nested/dir/data.txt']);
    expect(existsSync(join(destDir, 'deep/nested/dir/data.txt'))).toBe(true);
  });

  it('skips identical files', async () => {
    const content = '# Identical content';
    const srcPath = join(srcDir, 'same.md');
    await writeFile(srcPath, content, 'utf-8');

    // Create the destination file with identical content
    const destPath = join(destDir, 'core/same.md');
    await ensureDir(join(destDir, 'core'));
    await writeFile(destPath, content, 'utf-8');

    const mappings: FileMapping[] = [
      { sourcePath: srcPath, syncRepoPath: 'core/same.md' },
    ];

    const result = await copyFiles(mappings, destDir);

    expect(result.copied).toEqual([]);
    expect(result.skipped).toEqual(['core/same.md']);
    expect(result.errors).toEqual([]);
  });

  it('copies multiple files', async () => {
    const file1 = join(srcDir, 'a.md');
    const file2 = join(srcDir, 'b.md');
    await writeFile(file1, 'File A', 'utf-8');
    await writeFile(file2, 'File B', 'utf-8');

    const mappings: FileMapping[] = [
      { sourcePath: file1, syncRepoPath: 'core/a.md' },
      { sourcePath: file2, syncRepoPath: 'core/b.md' },
    ];

    const result = await copyFiles(mappings, destDir);

    expect(result.copied).toHaveLength(2);
    expect(result.errors).toEqual([]);
  });

  it('records errors for missing source files', async () => {
    const mappings: FileMapping[] = [
      { sourcePath: join(srcDir, 'nonexistent.md'), syncRepoPath: 'core/nonexistent.md' },
    ];

    const result = await copyFiles(mappings, destDir);

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('nonexistent.md');
  });
});

describe('compareFiles', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'cc-cmp-'));
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it('returns true for identical files', async () => {
    const content = 'identical content here';
    const file1 = join(tmpDir, 'a.txt');
    const file2 = join(tmpDir, 'b.txt');
    await writeFile(file1, content, 'utf-8');
    await writeFile(file2, content, 'utf-8');

    expect(await compareFiles(file1, file2)).toBe(true);
  });

  it('returns false for different files', async () => {
    const file1 = join(tmpDir, 'a.txt');
    const file2 = join(tmpDir, 'b.txt');
    await writeFile(file1, 'content A', 'utf-8');
    await writeFile(file2, 'content B', 'utf-8');

    expect(await compareFiles(file1, file2)).toBe(false);
  });

  it('returns false when first file does not exist', async () => {
    const file2 = join(tmpDir, 'exists.txt');
    await writeFile(file2, 'content', 'utf-8');

    expect(await compareFiles(join(tmpDir, 'missing.txt'), file2)).toBe(false);
  });

  it('returns false when second file does not exist', async () => {
    const file1 = join(tmpDir, 'exists.txt');
    await writeFile(file1, 'content', 'utf-8');

    expect(await compareFiles(file1, join(tmpDir, 'missing.txt'))).toBe(false);
  });

  it('returns false when both files do not exist', async () => {
    expect(
      await compareFiles(join(tmpDir, 'a.txt'), join(tmpDir, 'b.txt')),
    ).toBe(false);
  });

  it('handles binary content correctly', async () => {
    const buf = Buffer.from([0x00, 0x01, 0x02, 0xff]);
    const file1 = join(tmpDir, 'bin1');
    const file2 = join(tmpDir, 'bin2');
    await writeFile(file1, buf);
    await writeFile(file2, buf);

    expect(await compareFiles(file1, file2)).toBe(true);
  });
});

describe('ensureDir', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'cc-ensure-'));
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it('creates nested directories', async () => {
    const nestedPath = join(tmpDir, 'a', 'b', 'c');
    await ensureDir(nestedPath);

    const stats = await stat(nestedPath);
    expect(stats.isDirectory()).toBe(true);
  });

  it('does not throw if directory already exists', async () => {
    const dirPath = join(tmpDir, 'existing');
    await ensureDir(dirPath);
    // Call again - should not throw
    await expect(ensureDir(dirPath)).resolves.toBeUndefined();
  });
});
