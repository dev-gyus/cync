import { readFile } from 'node:fs/promises';

export interface SensitiveMatch {
  /** Human-readable pattern name (e.g., "API Key") */
  pattern: string;
  /** 1-based line number where the match was found */
  line: number;
  /** Redacted preview of the matched line */
  preview: string;
}

export interface ScanResult {
  /** File path that was scanned */
  file: string;
  /** Sensitive matches found in this file */
  matches: SensitiveMatch[];
}

const SENSITIVE_PATTERNS: Array<{ name: string; pattern: RegExp }> = [
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
export function redactLine(line: string, match: RegExpMatchArray): string {
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
export async function scanFile(filePath: string): Promise<SensitiveMatch[]> {
  const content = await readFile(filePath, 'utf-8');
  const lines = content.split('\n');
  const matches: SensitiveMatch[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;

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
export async function scanFiles(filePaths: string[]): Promise<ScanResult[]> {
  const results: ScanResult[] = [];

  for (const filePath of filePaths) {
    try {
      const matches = await scanFile(filePath);
      if (matches.length > 0) {
        results.push({ file: filePath, matches });
      }
    } catch {
      // Skip files that cannot be read (binary, permission errors, etc.)
    }
  }

  return results;
}
