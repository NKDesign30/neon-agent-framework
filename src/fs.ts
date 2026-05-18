import { access, copyFile, mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { homedir } from "node:os";

export function expandHome(input: string): string {
  if (input === "~") {
    return homedir();
  }

  if (input.startsWith("~/")) {
    return join(homedir(), input.slice(2));
  }

  return input;
}

export function resolvePath(input: string): string {
  return resolve(expandHome(input));
}

export async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

export async function ensureDir(path: string): Promise<void> {
  await mkdir(path, { recursive: true });
}

export async function ensureWritableDir(path: string): Promise<void> {
  await ensureDir(path);
  await access(path, constants.W_OK);
}

export async function readJsonUnknown(path: string): Promise<unknown> {
  const raw = await readFile(path, "utf8");
  return JSON.parse(raw) as unknown;
}

export async function writeJson(path: string, value: unknown): Promise<void> {
  await ensureDir(dirname(path));
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export async function writeFileIfMissing(path: string, contents: string): Promise<boolean> {
  if (await pathExists(path)) {
    return false;
  }

  await ensureDir(dirname(path));
  await writeFile(path, contents, "utf8");
  return true;
}

export async function copyDirectoryMissing(sourceDir: string, targetDir: string): Promise<string[]> {
  await ensureDir(targetDir);
  const copied: string[] = [];
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
