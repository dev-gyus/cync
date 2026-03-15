import chalk from 'chalk';

const PREFIX = {
  info: chalk.blue('[INFO]'),
  success: chalk.green('[OK]'),
  warn: chalk.yellow('[WARN]'),
  error: chalk.red('[ERROR]'),
} as const;

/**
 * Log an informational message with a blue prefix.
 */
export function info(msg: string): void {
  console.log(`${PREFIX.info} ${msg}`);
}

/**
 * Log a success message with a green prefix.
 */
export function success(msg: string): void {
  console.log(`${PREFIX.success} ${msg}`);
}

/**
 * Log a warning message with a yellow prefix.
 */
export function warn(msg: string): void {
  console.warn(`${PREFIX.warn} ${msg}`);
}

/**
 * Log an error message with a red prefix.
 */
export function error(msg: string): void {
  console.error(`${PREFIX.error} ${msg}`);
}

/**
 * Print a simple table to stdout.
 *
 * @param headers - Column header labels
 * @param rows - 2D array of cell values
 */
export function table(headers: string[], rows: string[][]): void {
  // Calculate the maximum width of each column
  const colWidths = headers.map((h, i) =>
    Math.max(
      h.length,
      ...rows.map((row) => (row[i] ?? '').length),
    ),
  );

  const separator = colWidths.map((w) => '-'.repeat(w + 2)).join('+');

  const formatRow = (cells: string[]): string =>
    cells.map((cell, i) => ` ${(cell ?? '').padEnd(colWidths[i]!)} `).join('|');

  console.log(formatRow(headers));
  console.log(separator);
  for (const row of rows) {
    console.log(formatRow(row));
  }
}

/**
 * Print a horizontal divider line.
 */
export function divider(): void {
  console.log(chalk.gray('-'.repeat(60)));
}
