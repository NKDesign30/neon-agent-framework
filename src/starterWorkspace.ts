import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { copyDirectoryMissing, ensureDir } from "./fs.js";

const STARTER_WORKSPACE_DIRS = ["agents", "memory", "tasks", "skills", "channels", "approvals", "runs"];

function starterTemplateDir(): string {
  return fileURLToPath(new URL("../templates/starter/", import.meta.url));
}

export async function ensureStarterWorkspaceDirs(workspaceDir: string): Promise<void> {
  for (const dir of STARTER_WORKSPACE_DIRS) {
    await ensureDir(join(workspaceDir, dir));
  }
}

export async function copyStarterWorkspaceMissing(workspaceDir: string): Promise<string[]> {
  await ensureStarterWorkspaceDirs(workspaceDir);
  return copyDirectoryMissing(starterTemplateDir(), workspaceDir);
}
