import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { pathExists } from "./fs.js";

export async function readEnvValue(stateDir: string, key: string): Promise<string | undefined> {
  const processValue = process.env[key];
  if (processValue !== undefined && processValue.trim().length > 0) {
    return processValue.trim();
  }

  const stateEnv = await readStateEnv(stateDir);
  const stateValue = stateEnv[key];
  return stateValue !== undefined && stateValue.trim().length > 0 ? stateValue.trim() : undefined;
}

export async function requireEnvValue(stateDir: string, key: string, purpose: string): Promise<string> {
  const value = await readEnvValue(stateDir, key);
  if (value !== undefined) {
    return value;
  }

  throw new Error(`Missing ${key}. Add it to ${join(stateDir, ".env")} or export it before ${purpose}.`);
}

export async function readStateEnv(stateDir: string): Promise<Record<string, string>> {
  const envPath = join(stateDir, ".env");
  if (!(await pathExists(envPath))) {
    return {};
  }

  const raw = await readFile(envPath, "utf8");
  const values: Record<string, string> = {};
  for (const line of raw.split(/\r?\n/)) {
    const parsed = parseEnvLine(line);
    if (parsed !== null) {
      values[parsed.key] = parsed.value;
    }
  }

  return values;
}

function parseEnvLine(line: string): { key: string; value: string } | null {
  const trimmed = line.trim();
  if (trimmed.length === 0 || trimmed.startsWith("#")) {
    return null;
  }

  const index = trimmed.indexOf("=");
  if (index <= 0) {
    return null;
  }

  const key = trimmed.slice(0, index).trim();
  const rawValue = trimmed.slice(index + 1).trim();
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) {
    return null;
  }

  return {
    key,
    value: stripEnvQuotes(rawValue)
  };
}

function stripEnvQuotes(value: string): string {
  if (value.length >= 2 && ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'")))) {
    return value.slice(1, -1);
  }

  return value;
}
