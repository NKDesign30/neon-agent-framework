import { defaultStateDir, loadConfig } from "../config.js";
import { startRuntime } from "../runtime.js";
import { readBooleanFlag, readStringFlag } from "../args.js";
export async function runStart(flags) {
    const config = await loadConfig(readStringFlag(flags, "state-dir") ?? defaultStateDir());
    const prompt = readStringFlag(flags, "prompt");
    await startRuntime(config, {
        once: readBooleanFlag(flags, "once"),
        ...(prompt !== undefined ? { prompt } : {})
    });
}
//# sourceMappingURL=start.js.map