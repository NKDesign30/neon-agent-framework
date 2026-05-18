import { appendFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { ensureDir, writeJson } from "./fs.js";
import type { INeonConfig, IRuntimeStatus } from "./types.js";

export interface IStartRuntimeOptions {
  once: boolean;
}

export async function startRuntime(config: INeonConfig, options: IStartRuntimeOptions): Promise<void> {
  await ensureDir(config.logDir);
  await ensureDir(config.workspaceDir);

  const status: IRuntimeStatus = {
    name: config.name,
    pid: process.pid,
    startedAt: new Date().toISOString(),
    stateDir: config.stateDir,
    workspaceDir: config.workspaceDir,
    approvalMode: config.approvalPolicy.mode
  };

  await writeJson(join(config.stateDir, "runtime-status.json"), status);
  await appendFile(join(config.logDir, "runtime.log"), `${status.startedAt} runtime started pid=${status.pid}\n`, "utf8");
  console.log(`Neon runtime started: ${config.name}`);
  console.log(`State: ${config.stateDir}`);
  console.log(`Workspace: ${config.workspaceDir}`);
  console.log(`Approval mode: ${config.approvalPolicy.mode}`);

  if (options.once) {
    await writeFile(join(config.stateDir, "last-run.txt"), new Date().toISOString(), "utf8");
    console.log("One-shot runtime smoke completed.");
    return;
  }

  await keepAlive(config);
}

async function keepAlive(config: INeonConfig): Promise<void> {
  let stopped = false;
  const stop = (): void => {
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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
