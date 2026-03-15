/**
 * Log an informational message with a blue prefix.
 */
export declare function info(msg: string): void;
/**
 * Log a success message with a green prefix.
 */
export declare function success(msg: string): void;
/**
 * Log a warning message with a yellow prefix.
 */
export declare function warn(msg: string): void;
/**
 * Log an error message with a red prefix.
 */
export declare function error(msg: string): void;
/**
 * Print a simple table to stdout.
 *
 * @param headers - Column header labels
 * @param rows - 2D array of cell values
 */
export declare function table(headers: string[], rows: string[][]): void;
/**
 * Print a horizontal divider line.
 */
export declare function divider(): void;
