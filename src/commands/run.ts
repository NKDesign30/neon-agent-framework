import { defaultStateDir, loadConfig } from "../config.js";
import { runAgentPrompt } from "../provider.js";
import { readBooleanFlag, readStringFlag, type ICliFlags } from "../args.js";

export async function runPrompt(flags: ICliFlags): Promise<void> {
  const config = await loadConfig(readStringFlag(flags, "state-dir") ?? defaultStateDir());
  const prompt = readStringFlag(flags, "prompt") ?? flags.positional.join(" ");
  const result = await runAgentPrompt(config, prompt);

  if (readBooleanFlag(flags, "json")) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.log(result.output);
}
