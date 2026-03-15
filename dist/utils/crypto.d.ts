/**
 * Retrieve the encryption key from the CC_SYNC_KEY environment variable.
 *
 * @throws Error if the environment variable is not set
 */
export declare function getEncryptionKey(): string;
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
export declare function encrypt(data: Buffer, key: string): Buffer;
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
export declare function decrypt(data: Buffer, key: string): Buffer;
/**
 * Encrypt a file and write the result to an output path.
 *
 * @param inputPath - Path to the plaintext file
 * @param outputPath - Path where the encrypted file will be written
 * @param key - Hex-encoded 256-bit key
 */
export declare function encryptFile(inputPath: string, outputPath: string, key: string): Promise<void>;
/**
 * Decrypt a file and write the result to an output path.
 *
 * @param inputPath - Path to the encrypted file
 * @param outputPath - Path where the decrypted file will be written
 * @param key - Hex-encoded 256-bit key
 */
export declare function decryptFile(inputPath: string, outputPath: string, key: string): Promise<void>;
/**
 * Generate a random 256-bit encryption key as a hex string.
 *
 * @returns 64-character hex string suitable for use as an AES-256 key
 */
export declare function generateKey(): string;
