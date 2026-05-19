import type { ICliFlags } from "./types.js";

export type { ICliFlags } from "./types.js";

const BOOLEAN_FLAGS = new Set([
  "fix",
  "force",
  "help",
  "install-daemon",
  "json",
  "no-load",
  "no-project-context",
  "no-progress",
  "non-interactive",
  "once",
  "repair"
]);

export function parseFlags(args: string[]): ICliFlags {
  const values: Record<string, string | boolean> = {};
  const positional: string[] = [];

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === undefined) {
      continue;
    }

    if (!arg.startsWith("--")) {
      positional.push(arg);
      continue;
    }

    const rawName = arg.slice(2);
    if (rawName.length === 0) {
      continue;
    }

    const eqIndex = rawName.indexOf("=");
    if (eqIndex >= 0) {
      const key = rawName.slice(0, eqIndex);
      values[key] = rawName.slice(eqIndex + 1);
      continue;
    }

    if (BOOLEAN_FLAGS.has(rawName)) {
      values[rawName] = true;
      continue;
    }

    const next = args[index + 1];
    if (next !== undefined && !next.startsWith("--")) {
      values[rawName] = next;
      index += 1;
      continue;
    }

    values[rawName] = true;
  }

  return { values, positional };
}

export function readStringFlag(flags: ICliFlags, name: string): string | undefined {
  const value = flags.values[name];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

export function readBooleanFlag(flags: ICliFlags, name: string): boolean {
  return flags.values[name] === true;
}

export function hasFlag(flags: ICliFlags, name: string): boolean {
  return Object.prototype.hasOwnProperty.call(flags.values, name);
}
