import { SyncModule } from './base-module.js';
export { SyncModule, FileMapping, CopyResult } from './base-module.js';
/**
 * Retrieve a single module by name.
 */
export declare function getModule(name: string): SyncModule | undefined;
/**
 * Return only the modules whose names are enabled (truthy) in the given config.
 * If a module name is not present in the config it is treated as disabled.
 */
export declare function getEnabledModules(moduleConfig: Record<string, boolean>): SyncModule[];
/**
 * Return every registered module.
 */
export declare function getAllModules(): SyncModule[];
