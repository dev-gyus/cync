import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  encrypt,
  decrypt,
  generateKey,
  encryptFile,
  decryptFile,
} from '../../src/utils/crypto';

describe('generateKey', () => {
  it('returns a 64-character hex string', () => {
    const key = generateKey();
    expect(key).toHaveLength(64);
    expect(key).toMatch(/^[0-9a-f]{64}$/);
  });

  it('generates unique keys each call', () => {
    const key1 = generateKey();
    const key2 = generateKey();
    expect(key1).not.toBe(key2);
  });
});

describe('encrypt / decrypt roundtrip', () => {
  it('returns original data after encrypt + decrypt', () => {
    const key = generateKey();
    const original = Buffer.from('Hello, World!');

    const encrypted = encrypt(original, key);
    const decrypted = decrypt(encrypted, key);

    expect(decrypted.toString('utf-8')).toBe('Hello, World!');
  });

  it('works with empty data', () => {
    const key = generateKey();
    const original = Buffer.alloc(0);

    const encrypted = encrypt(original, key);
    const decrypted = decrypt(encrypted, key);

    expect(decrypted).toEqual(Buffer.alloc(0));
  });

  it('works with large data', () => {
    const key = generateKey();
    const original = Buffer.alloc(1024 * 100, 0xab); // 100KB

    const encrypted = encrypt(original, key);
    const decrypted = decrypt(encrypted, key);

    expect(decrypted.equals(original)).toBe(true);
  });

  it('works with binary data', () => {
    const key = generateKey();
    const original = Buffer.from([0x00, 0x01, 0xff, 0xfe, 0x80, 0x7f]);

    const encrypted = encrypt(original, key);
    const decrypted = decrypt(encrypted, key);

    expect(decrypted.equals(original)).toBe(true);
  });

  it('produces different ciphertext for same plaintext (random IV)', () => {
    const key = generateKey();
    const original = Buffer.from('same plaintext');

    const enc1 = encrypt(original, key);
    const enc2 = encrypt(original, key);

    // Due to random IV, ciphertexts should differ
    expect(enc1.equals(enc2)).toBe(false);

    // But both should decrypt to the same plaintext
    expect(decrypt(enc1, key).toString()).toBe('same plaintext');
    expect(decrypt(enc2, key).toString()).toBe('same plaintext');
  });
});

describe('decrypt with wrong key', () => {
  it('throws an error', () => {
    const key1 = generateKey();
    const key2 = generateKey();
    const original = Buffer.from('secret data');

    const encrypted = encrypt(original, key1);

    expect(() => decrypt(encrypted, key2)).toThrow();
  });
});

describe('encrypt / decrypt input validation', () => {
  it('throws on invalid key length for encrypt', () => {
    const shortKey = 'abcd';
    const data = Buffer.from('test');

    expect(() => encrypt(data, shortKey)).toThrow(/Invalid key length/);
  });

  it('throws on invalid key length for decrypt', () => {
    const shortKey = 'abcd';
    const data = Buffer.alloc(30); // at least IV + auth tag size

    expect(() => decrypt(data, shortKey)).toThrow(/Invalid key length/);
  });

  it('throws on too-short encrypted data for decrypt', () => {
    const key = generateKey();
    const tooShort = Buffer.alloc(10); // Less than IV_LENGTH + AUTH_TAG_LENGTH = 28

    expect(() => decrypt(tooShort, key)).toThrow(/Invalid encrypted data/);
  });
});

describe('encryptFile / decryptFile roundtrip', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'cc-crypto-file-'));
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it('roundtrips a text file correctly', async () => {
    const key = generateKey();
    const originalContent = '# My Secret Config\napi_key: sk-secret123';

    const inputPath = join(tmpDir, 'plain.txt');
    const encryptedPath = join(tmpDir, 'encrypted.bin');
    const decryptedPath = join(tmpDir, 'decrypted.txt');

    await writeFile(inputPath, originalContent, 'utf-8');

    await encryptFile(inputPath, encryptedPath, key);
    await decryptFile(encryptedPath, decryptedPath, key);

    const result = await readFile(decryptedPath, 'utf-8');
    expect(result).toBe(originalContent);
  });

  it('encrypted file differs from original', async () => {
    const key = generateKey();
    const originalContent = 'Hello, encryption!';

    const inputPath = join(tmpDir, 'plain.txt');
    const encryptedPath = join(tmpDir, 'encrypted.bin');

    await writeFile(inputPath, originalContent, 'utf-8');
    await encryptFile(inputPath, encryptedPath, key);

    const originalBuf = await readFile(inputPath);
    const encryptedBuf = await readFile(encryptedPath);

    expect(originalBuf.equals(encryptedBuf)).toBe(false);
  });

  it('roundtrips a binary file correctly', async () => {
    const key = generateKey();
    const binaryContent = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

    const inputPath = join(tmpDir, 'image.bin');
    const encryptedPath = join(tmpDir, 'encrypted.bin');
    const decryptedPath = join(tmpDir, 'decrypted.bin');

    await writeFile(inputPath, binaryContent);
    await encryptFile(inputPath, encryptedPath, key);
    await decryptFile(encryptedPath, decryptedPath, key);

    const result = await readFile(decryptedPath);
    expect(result.equals(binaryContent)).toBe(true);
  });
});
