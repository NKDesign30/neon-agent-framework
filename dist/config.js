import { join } from "node:path";
import { homedir } from "node:os";
import { ensureDir, readJsonUnknown, resolvePath, writeJson } from "./fs.js";
const PROVIDERS = new Set(["openai", "anthropic", "openrouter", "none"]);
const APPROVAL_MODES = new Set(["prompt", "strict"]);
export function defaultStateDir() {
    return resolvePath(process.env.NEON_AGENT_STATE_DIR ?? "~/.neon-agent");
}
export function configPathForState(stateDir) {
    return process.env.NEON_AGENT_CONFIG_PATH ?? join(stateDir, "config.json");
}
export function defaultWorkspaceDir(name) {
    return resolvePath(join(homedir(), `${name}-workspace`));
}
export function defaultModelForProvider(provider) {
    switch (provider) {
        case "openai":
            return "gpt-5.4";
        case "anthropic":
            return "claude-sonnet-4-5";
        case "openrouter":
            return "openrouter/auto";
        case "none":
            return "local-demo";
    }
}
export function apiKeyEnvForProvider(provider) {
    switch (provider) {
        case "openai":
            return "OPENAI_API_KEY";
        case "anthropic":
            return "ANTHROPIC_API_KEY";
        case "openrouter":
            return "OPENROUTER_API_KEY";
        case "none":
            return undefined;
    }
}
export function createConfig(input) {
    const now = new Date().toISOString();
    const stateDir = resolvePath(input.stateDir);
    const workspaceDir = resolvePath(input.workspaceDir);
    const logDir = join(stateDir, "logs");
    const model = input.model ?? defaultModelForProvider(input.provider);
    const providerBase = {
        kind: input.provider,
        model
    };
    const apiKeyEnv = apiKeyEnvForProvider(input.provider);
    const provider = apiKeyEnv === undefined ? providerBase : { ...providerBase, apiKeyEnv };
    const discordBase = {
        enabled: input.discordTokenEnv !== undefined || input.discordChannelId !== undefined
    };
    const discord = {
        ...discordBase,
        ...(input.discordTokenEnv !== undefined ? { botTokenEnv: input.discordTokenEnv } : {}),
        ...(input.discordChannelId !== undefined ? { channelId: input.discordChannelId } : {})
    };
    const approvalPolicy = {
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
export async function saveConfig(config) {
    await ensureDir(config.stateDir);
    await ensureDir(config.logDir);
    const path = configPathForState(config.stateDir);
    await writeJson(path, config);
    return path;
}
export async function loadConfig(stateDirInput) {
    const stateDir = resolvePath(stateDirInput ?? defaultStateDir());
    const path = configPathForState(stateDir);
    const raw = await readJsonUnknown(path);
    return parseConfig(raw, path);
}
export function parseConfig(raw, source) {
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
export function envTemplate() {
    return `# Neon Agent Framework local env
# Keep real secrets out of git.

# OPENAI_API_KEY=<openai-api-key>
# ANTHROPIC_API_KEY=<anthropic-api-key>
# OPENROUTER_API_KEY=<openrouter-api-key>
# DISCORD_BOT_TOKEN=
# DISCORD_CHANNEL_ID=
`;
}
function isRecord(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}
function isNonEmptyString(value) {
    return typeof value === "string" && value.length > 0;
}
function isProviderKind(value) {
    return typeof value === "string" && PROVIDERS.has(value);
}
function isApprovalMode(value) {
    return typeof value === "string" && APPROVAL_MODES.has(value);
}
function isStringArray(value) {
    return Array.isArray(value) && value.every((item) => typeof item === "string");
}
function isProviderConfig(value) {
    if (!isRecord(value)) {
        return false;
    }
    if (!isProviderKind(value.kind) || !isNonEmptyString(value.model)) {
        return false;
    }
    return value.apiKeyEnv === undefined || isNonEmptyString(value.apiKeyEnv);
}
function isDiscordConfig(value) {
    if (!isRecord(value) || typeof value.enabled !== "boolean") {
        return false;
    }
    const tokenOk = value.botTokenEnv === undefined || isNonEmptyString(value.botTokenEnv);
    const channelOk = value.channelId === undefined || isNonEmptyString(value.channelId);
    return tokenOk && channelOk;
}
function isApprovalPolicy(value) {
    if (!isRecord(value) || !isApprovalMode(value.mode)) {
        return false;
    }
    return isStringArray(value.directActions) && isStringArray(value.requireApprovalFor);
}
//# sourceMappingURL=config.js.map