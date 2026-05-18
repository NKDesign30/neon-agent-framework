import { defaultStateDir, loadConfig } from "../config.js";
import { startRuntime } from "../runtime.js";
import { readBooleanFlag, readStringFlag, type ICliFlags } from "../args.js";

export async function runStart(flags: ICliFlags): Promise<void> {
  const config = await loadConfig(readStringFlag(flags, "state-dir") ?? defaultStateDir());
  await startRuntime(config, { once: readBooleanFlag(flags, "once") });
}
