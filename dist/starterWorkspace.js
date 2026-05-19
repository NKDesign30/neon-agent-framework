import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { copyDirectoryMissing, ensureDir } from "./fs.js";
const STARTER_WORKSPACE_DIRS = ["agents", "memory", "tasks", "skills", "channels", "approvals", "runs"];
function starterTemplateDir() {
    return fileURLToPath(new URL("../templates/starter/", import.meta.url));
}
export async function ensureStarterWorkspaceDirs(workspaceDir) {
    for (const dir of STARTER_WORKSPACE_DIRS) {
        await ensureDir(join(workspaceDir, dir));
    }
}
export async function copyStarterWorkspaceMissing(workspaceDir) {
    await ensureStarterWorkspaceDirs(workspaceDir);
    return copyDirectoryMissing(starterTemplateDir(), workspaceDir);
}
//# sourceMappingURL=starterWorkspace.js.map