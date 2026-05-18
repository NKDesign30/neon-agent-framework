import { defaultStateDir, loadConfig } from "../config.js";
import { sendDiscordMessage } from "../discord.js";
import { readBooleanFlag, readStringFlag, type ICliFlags } from "../args.js";

export async function runDiscord(flags: ICliFlags): Promise<void> {
  const config = await loadConfig(readStringFlag(flags, "state-dir") ?? defaultStateDir());
  const subcommand = flags.positional[0] ?? "send";

  switch (subcommand) {
    case "send": {
      const content = readStringFlag(flags, "content") ?? flags.positional.slice(1).join(" ");
      const result = await sendDiscordMessage(config, content);
      if (readBooleanFlag(flags, "json")) {
        console.log(JSON.stringify(result, null, 2));
        return;
      }
      console.log(`Sent Discord message ${result.id} to ${result.channelId}`);
      return;
    }
    default:
      throw new Error(`Unknown discord command: ${subcommand}`);
  }
}
