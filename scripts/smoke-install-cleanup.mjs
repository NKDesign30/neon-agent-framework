import { execFile } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const tmpDir = await mkdtemp(join(tmpdir(), "neon-install-cleanup-"));

async function exists(path) {
  try {
    await stat(path);
    return true;
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return false;
    }
    throw error;
  }
}

try {
  const fakeBinDir = join(tmpDir, "bin");
  const fakeGlobalRoot = join(tmpDir, "npm-global", "lib", "node_modules");
  const fakeLogPath = join(tmpDir, "npm.log");
  const packageDir = join(fakeGlobalRoot, "neon-agent-framework");
  const staleRenameDir = join(fakeGlobalRoot, ".neon-agent-framework-qJjHCn");
  const unrelatedDir = join(fakeGlobalRoot, ".other-package");

  await mkdir(fakeBinDir, { recursive: true });
  await mkdir(join(packageDir, "leftover"), { recursive: true });
  await mkdir(join(staleRenameDir, "leftover"), { recursive: true });
  await mkdir(unrelatedDir, { recursive: true });

  const fakeNpm = `#!/usr/bin/env bash
set -euo pipefail
printf '%s\\n' "$*" >> "$FAKE_NPM_LOG"
case "$1" in
  root)
    if [[ "$2" != "-g" ]]; then
      echo "unexpected npm root args: $*" >&2
      exit 20
    fi
    echo "$FAKE_NPM_ROOT"
    ;;
  uninstall)
    if [[ "$2" != "-g" || "$3" != "neon-agent-framework" ]]; then
      echo "unexpected npm uninstall args: $*" >&2
      exit 21
    fi
    ;;
  pack)
    echo "neon-agent-framework-0.1.14.tgz"
    ;;
  install)
    if [[ "$2" != "-g" ]]; then
      echo "unexpected npm install args: $*" >&2
      exit 22
    fi
    ;;
  *)
    echo "unexpected npm command: $*" >&2
    exit 23
    ;;
esac
`;

  const fakeNpmPath = join(fakeBinDir, "npm");
  await writeFile(fakeNpmPath, fakeNpm, { encoding: "utf8", mode: 0o755 });

  await execFileAsync("bash", ["scripts/install.sh", "--no-onboard"], {
    cwd: root,
    env: {
      ...process.env,
      FAKE_NPM_LOG: fakeLogPath,
      FAKE_NPM_ROOT: fakeGlobalRoot,
      NEON_AGENT_PACKAGE: "github:NKDesign30/neon-agent-framework#test",
      PATH: `${fakeBinDir}:${process.env.PATH ?? ""}`,
    },
  });

  if (await exists(packageDir)) {
    throw new Error("installer did not remove old global package directory.");
  }
  if (await exists(staleRenameDir)) {
    throw new Error("installer did not remove stale npm rename directory.");
  }
  if (!(await exists(unrelatedDir))) {
    throw new Error("installer removed an unrelated global directory.");
  }

  const log = await readFile(fakeLogPath, "utf8");
  for (const expected of [
    "uninstall -g neon-agent-framework",
    "root -g",
    "pack github:NKDesign30/neon-agent-framework#test --silent",
    "install -g",
  ]) {
    if (!log.includes(expected)) {
      throw new Error(`missing npm call: ${expected}`);
    }
  }

  console.log("Installer cleanup smoke passed.");
} finally {
  await rm(tmpDir, { force: true, recursive: true });
}
