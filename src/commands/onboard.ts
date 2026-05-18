import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { createConfig, defaultStateDir, defaultWorkspaceDir, envTemplate, saveConfig } from "../config.js";
import { installLaunchAgent } from "../launchagent.js";
import { initMemoryDatabase } from "../memoryStore.js";
import { copyDirectoryMissing, ensureDir, pathExists, resolvePath, writeFileIfMissing } from "../fs.js";
import { readBooleanFlag, readStringFlag, type ICliFlags } from "../args.js";
import type { ApprovalMode, ProviderKind } from "../types.js";

export async function runOnboard(flags: ICliFlags): Promise<void> {
  const nonInteractive = readBooleanFlag(flags, "non-interactive");
  const force = readBooleanFlag(flags, "force");
  const installDaemon = readBooleanFlag(flags, "install-daemon");

  const answers = nonInteractive ? readNonInteractive(flags) : await readInteractive(flags);
  const config = createConfig(answers);
  const configPath = join(config.stateDir, "config.json");

  if ((await pathExists(configPath)) && !force) {
    throw new Error(`Config already exists at ${configPath}. Use --force to overwrite.`);
  }

  await ensureDir(config.stateDir);
  await ensureDir(config.logDir);
  await ensureDir(config.workspaceDir);
  await ensureStarterWorkspaceDirs(config.workspaceDir);
  await writeFileIfMissing(join(config.stateDir, ".env"), envTemplate());
  await initMemoryDatabase(config);

  const templateDir = fileURLToPath(new URL("../../templates/starter/", import.meta.url));
  const copied = await copyDirectoryMissing(templateDir, config.workspaceDir);
  const savedPath = await saveConfig(config);

  console.log(`Created config: ${savedPath}`);
  console.log(`Memory database: ${join(config.stateDir, "memory", "memory.sqlite")}`);
  console.log(`Workspace: ${config.workspaceDir}`);
  if (copied.length > 0) {
    console.log(`Starter files: ${copied.join(", ")}`);
  }

  if (installDaemon) {
    const plistPath = await installLaunchAgent({
      config,
      nodePath: process.execPath,
      cliPath: resolveCliPath(),
      load: true
    });
    console.log(`LaunchAgent installed: ${plistPath}`);
  }

  console.log("Next: neon doctor && neon blueprint");
}

async function ensureStarterWorkspaceDirs(workspaceDir: string): Promise<void> {
  const dirs = ["agents", "memory", "tasks", "skills", "channels", "approvals", "runs"];
  for (const dir of dirs) {
    await ensureDir(join(workspaceDir, dir));
  }
}

function readNonInteractive(flags: ICliFlags): IOnboardAnswers {
  const name = readStringFlag(flags, "name") ?? "neon-agent";
  const provider = parseProvider(readStringFlag(flags, "provider") ?? "none");
  const stateDir = resolvePath(readStringFlag(flags, "state-dir") ?? defaultStateDir());
  const workspaceDir = resolvePath(readStringFlag(flags, "workspace") ?? defaultWorkspaceDir(name));
  const approvalMode = parseApprovalMode(readStringFlag(flags, "approval-mode") ?? "prompt");
  const model = readStringFlag(flags, "model");
  const discordTokenEnv = readStringFlag(flags, "discord-token-env");
  const discordChannelId = readStringFlag(flags, "discord-channel-id");

  return {
    name,
    stateDir,
    workspaceDir,
    provider,
    approvalMode,
    ...(model !== undefined ? { model } : {}),
    ...(discordTokenEnv !== undefined ? { discordTokenEnv } : {}),
    ...(discordChannelId !== undefined ? { discordChannelId } : {})
  };
}

async function readInteractive(flags: ICliFlags): Promise<IOnboardAnswers> {
  const rl = createInterface({ input, output });
  try {
    const defaultName = readStringFlag(flags, "name") ?? "neon-agent";
    const name = await ask(rl, "Agent name", defaultName);
    const stateDir = resolvePath(await ask(rl, "State dir", readStringFlag(flags, "state-dir") ?? defaultStateDir()));
    const workspaceDir = resolvePath(await ask(rl, "Workspace dir", readStringFlag(flags, "workspace") ?? defaultWorkspaceDir(name)));
    const provider = parseProvider(await ask(rl, "Provider [openai|anthropic|openrouter|none]", readStringFlag(flags, "provider") ?? "none"));
    const model = await askOptional(rl, "Model override", readStringFlag(flags, "model") ?? "");
    const discordTokenEnv = await askOptional(rl, "Discord bot token env", readStringFlag(flags, "discord-token-env") ?? "DISCORD_BOT_TOKEN");
    const discordChannelId = await askOptional(rl, "Discord channel id", readStringFlag(flags, "discord-channel-id") ?? "");
    const approvalMode = parseApprovalMode(await ask(rl, "Approval mode [prompt|strict]", readStringFlag(flags, "approval-mode") ?? "prompt"));

    return {
      name,
      stateDir,
      workspaceDir,
      provider,
      approvalMode,
      ...(model !== undefined ? { model } : {}),
      ...(discordTokenEnv !== undefined ? { discordTokenEnv } : {}),
      ...(discordChannelId !== undefined ? { discordChannelId } : {})
    };
  } finally {
    rl.close();
  }
}

interface IOnboardAnswers {
  name: string;
  stateDir: string;
  workspaceDir: string;
  provider: ProviderKind;
  approvalMode: ApprovalMode;
  model?: string;
  discordTokenEnv?: string;
  discordChannelId?: string;
}

async function ask(rl: ReturnType<typeof createInterface>, label: string, fallback: string): Promise<string> {
  const answer = await rl.question(`${label} (${fallback}): `);
  return answer.trim() || fallback;
}

async function askOptional(rl: ReturnType<typeof createInterface>, label: string, fallback: string): Promise<string | undefined> {
  const answer = await rl.question(`${label}${fallback.length > 0 ? ` (${fallback})` : ""}: `);
  const value = answer.trim() || fallback;
  return value.length > 0 ? value : undefined;
}

function parseProvider(value: string): ProviderKind {
  if (value === "openai" || value === "anthropic" || value === "openrouter" || value === "none") {
    return value;
  }

  throw new Error(`Unsupported provider: ${value}`);
}

function parseApprovalMode(value: string): ApprovalMode {
  if (value === "prompt" || value === "strict") {
    return value;
  }

  throw new Error(`Unsupported approval mode: ${value}`);
}

function resolveCliPath(): string {
  const argPath = process.argv[1];
  if (argPath !== undefined && argPath.length > 0) {
    return argPath;
  }

  return fileURLToPath(new URL("../cli.js", import.meta.url));
}
