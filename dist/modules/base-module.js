import * as fs from 'fs/promises';
import * as path from 'path';
/**
 * Check whether a file or directory exists at the given path.
 */
export async function fileExists(filePath) {
    try {
        await fs.access(filePath);
        return true;
    }
    catch {
        return false;
    }
}
/**
 * Copy files described by a set of mappings.
 *
 * @param mappings  - Array of FileMapping objects produced by a module's getFiles().
 * @param sourceBase - When direction is 'toSync' this is claudeDir; otherwise syncRepoDir.
 * @param targetBase - When direction is 'toSync' this is syncRepoDir; otherwise claudeDir.
 * @param direction  - 'toSync' copies sourcePath -> syncRepoPath under targetBase.
 *                     'fromSync' copies syncRepoPath under sourceBase -> sourcePath.
 */
export async function copyMappedFiles(mappings, sourceBase, targetBase, direction) {
    const result = {
        copied: [],
        skipped: [],
        errors: [],
    };
    for (const mapping of mappings) {
        let src;
        let dest;
        if (direction === 'toSync') {
            src = mapping.sourcePath;
            dest = path.join(targetBase, mapping.syncRepoPath);
        }
        else {
            src = path.join(sourceBase, mapping.syncRepoPath);
            dest = mapping.sourcePath;
        }
        try {
            const srcExists = await fileExists(src);
            if (!srcExists) {
                result.skipped.push(src);
                continue;
            }
            await fs.mkdir(path.dirname(dest), { recursive: true });
            await fs.copyFile(src, dest);
            result.copied.push(mapping.syncRepoPath);
        }
        catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            result.errors.push(`${mapping.syncRepoPath}: ${message}`);
        }
    }
    return result;
}
//# sourceMappingURL=base-module.js.map