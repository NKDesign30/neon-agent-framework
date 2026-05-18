import { constants } from "node:fs";
import { access } from "node:fs/promises";
import { delimiter, isAbsolute, join } from "node:path";
export function isExplicitCommandPath(command) {
    const trimmed = command.trim();
    return isAbsolute(trimmed) || trimmed.includes("/");
}
export async function resolveExecutable(command) {
    const trimmed = command.trim();
    if (trimmed.length === 0) {
        return undefined;
    }
    if (isExplicitCommandPath(trimmed)) {
        return (await canExecute(trimmed)) ? trimmed : undefined;
    }
    const pathValue = process.env.PATH ?? "";
    const dirs = pathValue.split(delimiter).filter((dir) => dir.length > 0);
    for (const dir of dirs) {
        const candidate = join(dir, trimmed);
        if (await canExecute(candidate)) {
            return candidate;
        }
    }
    return undefined;
}
async function canExecute(path) {
    try {
        await access(path, constants.X_OK);
        return true;
    }
    catch {
        return false;
    }
}
//# sourceMappingURL=commandResolver.js.map