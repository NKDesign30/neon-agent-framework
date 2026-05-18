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
  const cliCommand = readStringFlag(flags, "cli-command");
  const cliArgs = readCliArgsJson(flags);
  const discordTokenEnv = readStringFlag(flags, "discord-token-env");
  const discordChannelId = readStringFlag(flags, "discord-channel-id");

  return {
    name,
    stateDir,
    workspaceDir,
    provider,
    approvalMode,
    ...(model !== undefined ? { model } : {}),
    ...(cliCommand !== undefined ? { cliCommand } : {}),
    ...(cliArgs !== undefined ? { cliArgs } : {}),
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
    const providerAnswers = await readInteractiveProvider(rl, flags);
    const discordTokenEnv = await askOptional(rl, "Discord bot token env", readStringFlag(flags, "discord-token-env") ?? "DISCORD_BOT_TOKEN");
    const discordChannelId = await askOptional(rl, "Discord channel id", readStringFlag(flags, "discord-channel-id") ?? "");
    const approvalMode = parseApprovalMode(await ask(rl, "Approval mode [prompt|strict]", readStringFlag(flags, "approval-mode") ?? "prompt"));

    return {
      name,
      stateDir,
      workspaceDir,
      provider: providerAnswers.provider,
      approvalMode,
      ...(providerAnswers.model !== undefined ? { model: providerAnswers.model } : {}),
      ...(providerAnswers.cliCommand !== undefined ? { cliCommand: providerAnswers.cliCommand } : {}),
      ...(providerAnswers.cliArgs !== undefined ? { cliArgs: providerAnswers.cliArgs } : {}),
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
  cliCommand?: string;
  cliArgs?: string[];
  discordTokenEnv?: string;
  discordChannelId?: string;
}

interface IProviderAnswers {
  provider: ProviderKind;
  model?: string;
  cliCommand?: string;
  cliArgs?: string[];
}

async function readInteractiveProvider(rl: ReturnType<typeof createInterface>, flags: ICliFlags): Promise<IProviderAnswers> {
  const explicitProvider = readStringFlag(flags, "provider");
  if (explicitProvider !== undefined) {
    return readExplicitProvider(rl, flags, parseProvider(explicitProvider));
  }

  const mode = parseProviderMode(await ask(rl, "Model access [local|api|none]", "local"));
  switch (mode) {
    case "local":
      return readCliProvider(rl, flags);
    case "api":
      return readApiProvider(rl, flags);
    case "none":
      return { provider: "none" };
  }
}

async function readExplicitProvider(rl: ReturnType<typeof createInterface>, flags: ICliFlags, provider: ProviderKind): Promise<IProviderAnswers> {
  if (provider === "cli") {
    return readCliProvider(rl, flags);
  }

  if (isApiProvider(provider)) {
    const model = await askOptional(rl, "Model override", readStringFlag(flags, "model") ?? "");
    return {
      provider,
      ...(model !== undefined ? { model } : {})
    };
  }

  return { provider: "none" };
}

async function readCliProvider(rl: ReturnType<typeof createInterface>, flags: ICliFlags): Promise<IProviderAnswers> {
  const cliPreset = normalizeChoice(await ask(rl, "Local terminal tool [claude|codex|custom]", readStringFlag(flags, "model") ?? "claude"));
  if (cliPreset === "custom") {
    const cliCommand = await ask(rl, "CLI command", readStringFlag(flags, "cli-command") ?? "");
    if (cliCommand.trim().length === 0) {
      throw new Error("Custom CLI command is required.");
    }

    const cliArgs = await askCliArgs(rl, flags);
    return {
      provider: "cli",
      model: "custom",
      cliCommand,
      ...(cliArgs !== undefined ? { cliArgs } : {})
    };
  }

  if (cliPreset !== "claude" && cliPreset !== "codex") {
    throw new Error(`Unsupported local CLI preset: ${cliPreset}`);
  }

  const cliCommand = await askOptional(rl, "CLI command override", readStringFlag(flags, "cli-command") ?? "");
  const cliArgs = readCliArgsJson(flags);
  return {
    provider: "cli",
    model: cliPreset,
    ...(cliCommand !== undefined ? { cliCommand } : {}),
    ...(cliArgs !== undefined ? { cliArgs } : {})
  };
}

async function readApiProvider(rl: ReturnType<typeof createInterface>, flags: ICliFlags): Promise<IProviderAnswers> {
  const provider = parseApiProvider(await ask(rl, "API provider [openai|anthropic|openrouter]", "openai"));
  const model = await askOptional(rl, "Model override", readStringFlag(flags, "model") ?? "");
  return {
    provider,
    ...(model !== undefined ? { model } : {})
  };
}

async function askCliArgs(rl: ReturnType<typeof createInterface>, flags: ICliFlags): Promise<string[] | undefined> {
  const existing = readCliArgsJson(flags);
  if (existing !== undefined) {
    return existing;
  }

  const raw = await askOptional(rl, "CLI args JSON, use {prompt}", "");
  if (raw === undefined) {
    return undefined;
  }

  return parseCliArgsJson(raw);
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
  const normalized = normalizeChoice(value);
  if (normalized === "openai" || normalized === "anthropic" || normalized === "openrouter" || normalized === "cli" || normalized === "none") {
    return normalized;
  }

  throw new Error(`Unsupported provider: ${value}`);
}

function parseApprovalMode(value: string): ApprovalMode {
  const normalized = normalizeChoice(value);
  if (normalized === "prompt" || normalized === "strict") {
    return normalized;
  }

  throw new Error(`Unsupported approval mode: ${value}`);
}

type ProviderMode = "local" | "api" | "none";

function parseProviderMode(value: string): ProviderMode {
  const normalized = normalizeChoice(value);
  if (normalized === "local" || normalized === "api" || normalized === "none") {
    return normalized;
  }

  if (normalized === "cli" || normalized === "terminal") {
    return "local";
  }

  throw new Error(`Unsupported model connection: ${value}`);
}

function parseApiProvider(value: string): ProviderKind {
  const provider = parseProvider(value);
  if (isApiProvider(provider)) {
    return provider;
  }

  throw new Error(`Unsupported API provider: ${value}`);
}

function isApiProvider(provider: ProviderKind): boolean {
  return provider === "openai" || provider === "anthropic" || provider === "openrouter";
}

function normalizeChoice(value: string): string {
  return value.trim().toLowerCase();
}

function resolveCliPath(): string {
  const argPath = process.argv[1];
  if (argPath !== undefined && argPath.length > 0) {
    return argPath;
  }

  return fileURLToPath(new URL("../cli.js", import.meta.url));
}

function readCliArgsJson(flags: ICliFlags): string[] | undefined {
  const raw = readStringFlag(flags, "cli-args-json");
  if (raw === undefined) {
    return undefined;
  }

  return parseCliArgsJson(raw);
}

function parseCliArgsJson(raw: string): string[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    throw new Error("--cli-args-json must be valid JSON.");
  }

  if (!Array.isArray(parsed) || !parsed.every((item) => typeof item === "string")) {
    throw new Error("--cli-args-json must be a JSON string array.");
  }

  return parsed;
}
