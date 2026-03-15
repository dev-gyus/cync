import { readFile } from 'node:fs/promises';
const SENSITIVE_PATTERNS = [
    { name: 'API Key', pattern: /api[_-]?key\s*[:=]\s*["'][^"']+/i },
    { name: 'Token', pattern: /token\s*[:=]\s*["'][^"']+/i },
    { name: 'Password', pattern: /password\s*[:=]\s*["'][^"']+/i },
    { name: 'Secret', pattern: /secret\s*[:=]\s*["'][^"']+/i },
    { name: 'Private Key', pattern: /-----BEGIN\s+(RSA\s+)?PRIVATE\s+KEY-----/ },
    { name: 'OpenAI/Anthropic Key', pattern: /sk-[a-zA-Z0-9]{20,}/ },
    { name: 'GitHub Token', pattern: /ghp_[a-zA-Z0-9]{36}/ },
    { name: 'AWS Access Key', pattern: /aws_access_key_id\s*[:=]/i },
];
/**
 * Redact the sensitive portion of a line, replacing the matched value with
 * `***REDACTED***`.
 */
export function redactLine(line, match) {
    if (match.index === undefined) {
        return line;
    }
    const matchedText = match[0];
    return line.slice(0, match.index) + '***REDACTED***' + line.slice(match.index + matchedText.length);
}
/**
 * Scan a single file line by line for sensitive patterns.
 *
 * @param filePath - Absolute path to the file to scan
 * @returns Array of sensitive matches found in the file
 */
export async function scanFile(filePath) {
    const content = await readFile(filePath, 'utf-8');
    const lines = content.split('\n');
    const matches = [];
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        for (const { name, pattern } of SENSITIVE_PATTERNS) {
            const match = line.match(pattern);
            if (match) {
                matches.push({
                    pattern: name,
                    line: i + 1,
                    preview: redactLine(line, match),
                });
            }
        }
    }
    return matches;
}
/**
 * Scan multiple files for sensitive patterns.
 * Only files that contain at least one match are included in the results.
 *
 * @param filePaths - Array of absolute file paths to scan
 * @returns Array of scan results (only files with matches)
 */
export async function scanFiles(filePaths) {
    const results = [];
    for (const filePath of filePaths) {
        try {
            const matches = await scanFile(filePath);
            if (matches.length > 0) {
                results.push({ file: filePath, matches });
            }
        }
        catch {
            // Skip files that cannot be read (binary, permission errors, etc.)
        }
    }
    return results;
}
//# sourceMappingURL=sensitive-scanner.js.map