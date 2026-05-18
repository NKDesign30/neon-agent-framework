import { join } from "node:path";
import { homedir } from "node:os";
import { ensureDir, readJsonUnknown, resolvePath, writeJson } from "./fs.js";
import type { ApprovalMode, IApprovalPolicy, IDiscordConfig, INeonConfig, IProviderConfig, ProviderKind } from "./types.js";

const PROVIDERS = new Set<ProviderKind>(["openai", "anthropic", "openrouter", "cli", "none"]);
const APPROVAL_MODES = new Set<ApprovalMode>(["prompt", "strict"]);

export interface ICreateConfigInput {
  name: string;
  stateDir: string;
  workspaceDir: string;
  provider: ProviderKind;
  model?: string;
  cliCommand?: string;
  cliArgs?: string[];
  discordTokenEnv?: string;
  discordChannelId?: string;
  approvalMode?: ApprovalMode;
}

export function defaultStateDir(): string {
  return resolvePath(process.env.NEON_AGENT_STATE_DIR ?? "~/.neon-agent");
}

export function configPathForState(stateDir: string): string {
  return process.env.NEON_AGENT_CONFIG_PATH ?? join(stateDir, "config.json");
}

export function defaultWorkspaceDir(name: string): string {
  return resolvePath(join(homedir(), `${name}-workspace`));
}

export function defaultModelForProvider(provider: ProviderKind): string {
  switch (provider) {
    case "openai":
      return "gpt-5.4";
    case "anthropic":
      return "claude-sonnet-4-5";
    case "openrouter":
      return "openrouter/auto";
    case "cli":
      return "claude";
    case "none":
      return "local-demo";
  }
}

export function apiKeyEnvForProvider(provider: ProviderKind): string | undefined {
  switch (provider) {
    case "openai":
      return "OPENAI_API_KEY";
    case "anthropic":
      return "ANTHROPIC_API_KEY";
    case "openrouter":
      return "OPENROUTER_API_KEY";
    case "cli":
      return undefined;
    case "none":
      return undefined;
  }
}

export function createConfig(input: ICreateConfigInput): INeonConfig {
  const now = new Date().toISOString();
  const stateDir = resolvePath(input.stateDir);
  const workspaceDir = resolvePath(input.workspaceDir);
  const logDir = join(stateDir, "logs");
  const model = input.model ?? defaultModelForProvider(input.provider);
  const provider = createProviderConfig(input.provider, model, input.cliCommand, input.cliArgs);

  const discordBase: IDiscordConfig = {
    enabled: input.discordTokenEnv !== undefined || input.discordChannelId !== undefined
  };
  const discord: IDiscordConfig = {
    ...discordBase,
    ...(input.discordTokenEnv !== undefined ? { botTokenEnv: input.discordTokenEnv } : {}),
    ...(input.discordChannelId !== undefined ? { channelId: input.discordChannelId } : {})
  };

  const approvalPolicy: IApprovalPolicy = {
    mode: input.approvalMode ?? "prompt",
    directActions: ["doctor", "status", "read-only-summary"],
    requireApprovalFor: ["send-message", "write-file", "run-command", "git-push", "deploy"]
  };

  return {
    version: 1,
    name: input.name,
    stateDir,
    workspaceDir,
    logDir,
    provider,
    discord,
    approvalPolicy,
    createdAt: now,
    updatedAt: now
  };
}

export async function saveConfig(config: INeonConfig): Promise<string> {
  await ensureDir(config.stateDir);
  await ensureDir(config.logDir);
  const path = configPathForState(config.stateDir);
  await writeJson(path, config);
  return path;
}

export async function loadConfig(stateDirInput?: string): Promise<INeonConfig> {
  const stateDir = resolvePath(stateDirInput ?? defaultStateDir());
  const path = configPathForState(stateDir);
  const raw = await readJsonUnknown(path);
  return parseConfig(raw, path);
}

export function parseConfig(raw: unknown, source: string): INeonConfig {
  if (!isRecord(raw)) {
    throw new Error(`Config is not an object: ${source}`);
  }

  const version = raw.version;
  const name = raw.name;
  const stateDir = raw.stateDir;
  const workspaceDir = raw.workspaceDir;
  const logDir = raw.logDir;
  const providerRaw = raw.provider;
  const discordRaw = raw.discord;
  const approvalRaw = raw.approvalPolicy;
  const createdAt = raw.createdAt;
  const updatedAt = raw.updatedAt;

  if (version !== 1) {
    throw new Error(`Unsupported config version in ${source}`);
  }

  if (!isNonEmptyString(name) || !isNonEmptyString(stateDir) || !isNonEmptyString(workspaceDir) || !isNonEmptyString(logDir)) {
    throw new Error(`Config paths/name are invalid in ${source}`);
  }

  if (!isProviderConfig(providerRaw)) {
    throw new Error(`Provider config is invalid in ${source}`);
  }

  if (!isDiscordConfig(discordRaw)) {
    throw new Error(`Discord config is invalid in ${source}`);
  }

  if (!isApprovalPolicy(approvalRaw)) {
    throw new Error(`Approval policy is invalid in ${source}`);
  }

  if (!isNonEmptyString(createdAt) || !isNonEmptyString(updatedAt)) {
    throw new Error(`Config timestamps are invalid in ${source}`);
  }

  return {
    version,
    name,
    stateDir,
    workspaceDir,
    logDir,
    provider: providerRaw,
    discord: discordRaw,
    approvalPolicy: approvalRaw,
    createdAt,
    updatedAt
  };
}

export function envTemplate(): string {
  return `# Neon Agent Framework local env
# Keep real secrets out of git.

# OPENAI_API_KEY=<openai-api-key>
# ANTHROPIC_API_KEY=<anthropic-api-key>
# OPENROUTER_API_KEY=<openrouter-api-key>
# CLI providers reuse local auth from tools like claude or codex.
# DISCORD_BOT_TOKEN=
# DISCORD_CHANNEL_ID=
`;
}

function createProviderConfig(provider: ProviderKind, model: string, cliCommand?: string, cliArgs?: string[]): IProviderConfig {
  const providerBase: IProviderConfig = {
    kind: provider,
    model
  };

  if (provider === "cli") {
    const defaults = cliDefaultsForModel(model);
    return {
      ...providerBase,
      command: cliCommand ?? defaults.command,
      args: cliArgs ?? defaults.args
    };
  }

  const apiKeyEnv = apiKeyEnvForProvider(provider);
  return apiKeyEnv === undefined ? providerBase : { ...providerBase, apiKeyEnv };
}

function cliDefaultsForModel(model: string): { command: string; args: string[] } {
  const normalized = model.trim().toLowerCase();
  if (normalized === "codex" || normalized === "codex-cli") {
    return {
      command: "codex",
      args: ["exec", "{prompt}"]
    };
  }

  return {
    command: "claude",
    args: ["-p", "{prompt}"]
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function isProviderKind(value: unknown): value is ProviderKind {
  return typeof value === "string" && PROVIDERS.has(value as ProviderKind);
}

function isApprovalMode(value: unknown): value is ApprovalMode {
  return typeof value === "string" && APPROVAL_MODES.has(value as ApprovalMode);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isProviderConfig(value: unknown): value is IProviderConfig {
  if (!isRecord(value)) {
    return false;
  }

  if (!isProviderKind(value.kind) || !isNonEmptyString(value.model)) {
    return false;
  }

  if (value.kind === "cli") {
    return isNonEmptyString(value.command)
      && (value.args === undefined || isStringArray(value.args))
      && value.apiKeyEnv === undefined;
  }

  const apiKeyOk = value.apiKeyEnv === undefined || isNonEmptyString(value.apiKeyEnv);
  const cliFieldsAbsent = value.command === undefined && value.args === undefined;
  return apiKeyOk && cliFieldsAbsent;
}

function isDiscordConfig(value: unknown): value is IDiscordConfig {
  if (!isRecord(value) || typeof value.enabled !== "boolean") {
    return false;
  }

  const tokenOk = value.botTokenEnv === undefined || isNonEmptyString(value.botTokenEnv);
  const channelOk = value.channelId === undefined || isNonEmptyString(value.channelId);
  return tokenOk && channelOk;
}

function isApprovalPolicy(value: unknown): value is IApprovalPolicy {
  if (!isRecord(value) || !isApprovalMode(value.mode)) {
    return false;
  }

  return isStringArray(value.directActions) && isStringArray(value.requireApprovalFor);
}
