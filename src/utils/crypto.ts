import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const KEY_LENGTH = 32; // 256 bits

/**
 * Retrieve the encryption key from the CC_SYNC_KEY environment variable.
 *
 * @throws Error if the environment variable is not set
 */
export function getEncryptionKey(): string {
  const key = process.env.CC_SYNC_KEY;
  if (!key) {
    throw new Error(
      'CC_SYNC_KEY environment variable is not set. ' +
        'Generate a key with `generateKey()` and set it before encrypting.',
    );
  }
  return key;
}

/**
 * Encrypt data using AES-256-GCM.
 *
 * The returned buffer has the format:
 * - First 12 bytes: IV (initialization vector)
 * - Next 16 bytes: Authentication tag
 * - Remaining bytes: Encrypted data
 *
 * @param data - Plaintext data to encrypt
 * @param key - Hex-encoded 256-bit key
 * @returns Buffer containing IV + auth tag + ciphertext
 */
export function encrypt(data: Buffer, key: string): Buffer {
  const keyBuffer = Buffer.from(key, 'hex');
  if (keyBuffer.length !== KEY_LENGTH) {
    throw new Error(
      `Invalid key length: expected ${KEY_LENGTH} bytes (${KEY_LENGTH * 2} hex chars), got ${keyBuffer.length} bytes.`,
    );
  }

  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, keyBuffer, iv);

  const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
  const authTag = cipher.getAuthTag();

  // Format: [IV (12)] [Auth Tag (16)] [Encrypted Data]
  return Buffer.concat([iv, authTag, encrypted]);
}

/**
 * Decrypt data that was encrypted with {@link encrypt}.
 *
 * Expects the input buffer in the format:
 * - First 12 bytes: IV
 * - Next 16 bytes: Authentication tag
 * - Remaining bytes: Ciphertext
 *
 * @param data - Buffer containing IV + auth tag + ciphertext
 * @param key - Hex-encoded 256-bit key
 * @returns Decrypted plaintext buffer
 */
export function decrypt(data: Buffer, key: string): Buffer {
  const keyBuffer = Buffer.from(key, 'hex');
  if (keyBuffer.length !== KEY_LENGTH) {
    throw new Error(
      `Invalid key length: expected ${KEY_LENGTH} bytes (${KEY_LENGTH * 2} hex chars), got ${keyBuffer.length} bytes.`,
    );
  }

  const minLength = IV_LENGTH + AUTH_TAG_LENGTH;
  if (data.length < minLength) {
    throw new Error(
      `Invalid encrypted data: expected at least ${minLength} bytes, got ${data.length}.`,
    );
  }

  const iv = data.subarray(0, IV_LENGTH);
  const authTag = data.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const ciphertext = data.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

  const decipher = createDecipheriv(ALGORITHM, keyBuffer, iv);
  decipher.setAuthTag(authTag);

  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

/**
 * Encrypt a file and write the result to an output path.
 *
 * @param inputPath - Path to the plaintext file
 * @param outputPath - Path where the encrypted file will be written
 * @param key - Hex-encoded 256-bit key
 */
export async function encryptFile(
  inputPath: string,
  outputPath: string,
  key: string,
): Promise<void> {
  const data = await readFile(inputPath);
  const encrypted = encrypt(data, key);
  await writeFile(outputPath, encrypted);
}

/**
 * Decrypt a file and write the result to an output path.
 *
 * @param inputPath - Path to the encrypted file
 * @param outputPath - Path where the decrypted file will be written
 * @param key - Hex-encoded 256-bit key
 */
export async function decryptFile(
  inputPath: string,
  outputPath: string,
  key: string,
): Promise<void> {
  const data = await readFile(inputPath);
  const decrypted = decrypt(data, key);
  await writeFile(outputPath, decrypted);
}

/**
 * Generate a random 256-bit encryption key as a hex string.
 *
 * @returns 64-character hex string suitable for use as an AES-256 key
 */
export function generateKey(): string {
  return randomBytes(KEY_LENGTH).toString('hex');
}
