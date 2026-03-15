import { CoreSettingsModule } from './core-settings.js';
import { SkillsModule } from './skills.js';
import { CommandsModule } from './commands.js';
import { MemoryModule } from './memory.js';
import { PluginsModule } from './plugins.js';
import { PlansModule } from './plans.js';
import { FullBackupModule } from './full-backup.js';
const modules = new Map();
// Register all built-in modules
const builtinModules = [
    new CoreSettingsModule(),
    new SkillsModule(),
    new CommandsModule(),
    new MemoryModule(),
    new PluginsModule(),
    new PlansModule(),
    new FullBackupModule(),
];
for (const mod of builtinModules) {
    modules.set(mod.name, mod);
}
/**
 * Retrieve a single module by name.
 */
export function getModule(name) {
    return modules.get(name);
}
/**
 * Return only the modules whose names are enabled (truthy) in the given config.
 * If a module name is not present in the config it is treated as disabled.
 */
export function getEnabledModules(moduleConfig) {
    const enabled = [];
    for (const [name, mod] of modules) {
        if (moduleConfig[name]) {
            enabled.push(mod);
        }
    }
    return enabled;
}
/**
 * Return every registered module.
 */
export function getAllModules() {
    return Array.from(modules.values());
}
//# sourceMappingURL=index.js.map