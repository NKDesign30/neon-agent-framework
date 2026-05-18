import { appendFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { ensureDir, writeJson } from "./fs.js";
import { runAgentPrompt } from "./provider.js";
export async function startRuntime(config, options) {
    await ensureDir(config.logDir);
    await ensureDir(config.workspaceDir);
    const status = {
        name: config.name,
        pid: process.pid,
        startedAt: new Date().toISOString(),
        stateDir: config.stateDir,
        workspaceDir: config.workspaceDir,
        provider: config.provider.kind,
        model: config.provider.model,
        approvalMode: config.approvalPolicy.mode
    };
    await writeJson(join(config.stateDir, "runtime-status.json"), status);
    await appendFile(join(config.logDir, "runtime.log"), `${status.startedAt} runtime started pid=${status.pid} provider=${status.provider} model=${status.model}\n`, "utf8");
    console.log(`Neon runtime started: ${config.name}`);
    console.log(`State: ${config.stateDir}`);
    console.log(`Workspace: ${config.workspaceDir}`);
    console.log(`Provider: ${config.provider.kind}`);
    console.log(`Model: ${config.provider.model}`);
    console.log(`Approval mode: ${config.approvalPolicy.mode}`);
    if (options.prompt !== undefined && options.prompt.trim().length > 0) {
        const result = await runAgentPrompt(config, options.prompt);
        console.log(result.output);
        return;
    }
    if (options.once) {
        await writeFile(join(config.stateDir, "last-run.txt"), new Date().toISOString(), "utf8");
        console.log("One-shot runtime smoke completed.");
        return;
    }
    await keepAlive(config);
}
async function keepAlive(config) {
    let stopped = false;
    const stop = () => {
        stopped = true;
    };
    process.once("SIGINT", stop);
    process.once("SIGTERM", stop);
    while (!stopped) {
        await appendFile(join(config.logDir, "runtime.log"), `${new Date().toISOString()} heartbeat\n`, "utf8");
        await sleep(30_000);
    }
    await appendFile(join(config.logDir, "runtime.log"), `${new Date().toISOString()} runtime stopped\n`, "utf8");
}
function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}
//# sourceMappingURL=runtime.js.map