#!/usr/bin/env node
import { parseFlags } from "./args.js";
import { runBlueprint } from "./commands/blueprint.js";
import { runDaemon } from "./commands/daemon.js";
import { runDiscord } from "./commands/discord.js";
import { runDoctor } from "./commands/doctor.js";
import { runMemory } from "./commands/memory.js";
import { runOnboard } from "./commands/onboard.js";
import { runPrompt } from "./commands/run.js";
import { runStart } from "./commands/start.js";
import { runTask } from "./commands/task.js";
const HELP = `Neon Agent Framework

Usage:
  neon <command> [options]

Commands:
  onboard              Create config, env, workspace, starter files
  doctor               Validate local setup
  run <prompt>         Run one provider-backed agent prompt
    --no-progress      Disable the interactive progress indicator
    --no-project-context
                       Run CLI providers outside the workspace cwd
    --context-file <path>
                       Add one targeted workspace context file to the prompt
  memory <command>     Manage local SQLite memory
  task <command>       Manage local agent tasks
  discord send <text>  Send an explicit Discord message
  blueprint            Print builder roadmap for the local owner AI
  start                Start the runtime
  daemon <command>     Manage macOS LaunchAgent

Daemon commands:
  render | install | status | restart | logs | uninstall

Common options:
  --state-dir <path>
  --non-interactive
  --help
`;
async function main(argv) {
    const [commandRaw, ...rest] = argv;
    const command = commandRaw ?? "--help";
    if (command === "--help" || command === "-h" || command === "help") {
        console.log(HELP);
        return;
    }
    const flags = parseFlags(rest);
    switch (command) {
        case "onboard":
            await runOnboard(flags);
            return;
        case "doctor":
            await runDoctor(flags);
            return;
        case "run":
            await runPrompt(flags);
            return;
        case "memory":
            await runMemory(flags);
            return;
        case "task":
            await runTask(flags);
            return;
        case "discord":
            await runDiscord(flags);
            return;
        case "blueprint":
            await runBlueprint(flags);
            return;
        case "start":
            await runStart(flags);
            return;
        case "daemon":
            await runDaemon(flags);
            return;
        default:
            throw new Error(`Unknown command: ${command}`);
    }
}
main(process.argv.slice(2)).catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Error: ${message}`);
    process.exitCode = 1;
});
//# sourceMappingURL=cli.js.map