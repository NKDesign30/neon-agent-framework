import { defaultStateDir, loadConfig } from "../config.js";
import { withProgress } from "../progress.js";
import { runAgentPrompt } from "../provider.js";
import { readBooleanFlag, readStringFlag, type ICliFlags } from "../args.js";

export async function runPrompt(flags: ICliFlags): Promise<void> {
  const config = await loadConfig(readStringFlag(flags, "state-dir") ?? defaultStateDir());
  const prompt = readStringFlag(flags, "prompt") ?? flags.positional.join(" ");
  const json = readBooleanFlag(flags, "json");
  const showProgress = !json && !readBooleanFlag(flags, "no-progress");
  const result = showProgress
    ? await withProgress("Running agent job", () => runAgentPrompt(config, prompt))
    : await runAgentPrompt(config, prompt);

  if (json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.log(result.output);
}
