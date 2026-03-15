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
/**
 * Redact the sensitive portion of a line, replacing the matched value with
 * `***REDACTED***`.
 */
export declare function redactLine(line: string, match: RegExpMatchArray): string;
/**
 * Scan a single file line by line for sensitive patterns.
 *
 * @param filePath - Absolute path to the file to scan
 * @returns Array of sensitive matches found in the file
 */
export declare function scanFile(filePath: string): Promise<SensitiveMatch[]>;
/**
 * Scan multiple files for sensitive patterns.
 * Only files that contain at least one match are included in the results.
 *
 * @param filePaths - Array of absolute file paths to scan
 * @returns Array of scan results (only files with matches)
 */
export declare function scanFiles(filePaths: string[]): Promise<ScanResult[]>;
