#!/usr/bin/env node
import { parseFlags } from "./args.js";
import { runDaemon } from "./commands/daemon.js";
import { runDoctor } from "./commands/doctor.js";
import { runOnboard } from "./commands/onboard.js";
import { runStart } from "./commands/start.js";

const HELP = `Neon Agent Framework

Usage:
  neon <command> [options]

Commands:
  onboard              Create config, env, workspace, starter files
  doctor               Validate local setup
  start                Start the runtime
  daemon <command>     Manage macOS LaunchAgent

Daemon commands:
  render | install | status | restart | logs | uninstall

Common options:
  --state-dir <path>
  --non-interactive
  --help
`;

async function main(argv: string[]): Promise<void> {
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

main(process.argv.slice(2)).catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Error: ${message}`);
  process.exitCode = 1;
});
