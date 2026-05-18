import { access, copyFile, mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { homedir } from "node:os";
export function expandHome(input) {
    if (input === "~") {
        return homedir();
    }
    if (input.startsWith("~/")) {
        return join(homedir(), input.slice(2));
    }
    return input;
}
export function resolvePath(input) {
    return resolve(expandHome(input));
}
export async function pathExists(path) {
    try {
        await access(path, constants.F_OK);
        return true;
    }
    catch {
        return false;
    }
}
export async function ensureDir(path) {
    await mkdir(path, { recursive: true });
}
export async function ensureWritableDir(path) {
    await ensureDir(path);
    await access(path, constants.W_OK);
}
export async function readJsonUnknown(path) {
    const raw = await readFile(path, "utf8");
    return JSON.parse(raw);
}
export async function writeJson(path, value) {
    await ensureDir(dirname(path));
    await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}
export async function writeFileIfMissing(path, contents) {
    if (await pathExists(path)) {
        return false;
    }
    await ensureDir(dirname(path));
    await writeFile(path, contents, "utf8");
    return true;
}
export async function copyDirectoryMissing(sourceDir, targetDir) {
    await ensureDir(targetDir);
    const copied = [];
    const entries = await readdir(sourceDir);
    for (const entry of entries) {
        const source = join(sourceDir, entry);
        const target = join(targetDir, entry);
        const info = await stat(source);
        if (info.isDirectory()) {
            const nested = await copyDirectoryMissing(source, target);
            copied.push(...nested);
            continue;
        }
        if (!(await pathExists(target))) {
            await copyFile(source, target);
            copied.push(basename(target));
        }
    }
    return copied;
}
//# sourceMappingURL=fs.js.map