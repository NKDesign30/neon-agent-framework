import { appendFile } from "node:fs/promises";
import { join } from "node:path";
import { ensureDir } from "./fs.js";
import { requireEnvValue } from "./localEnv.js";
export async function sendDiscordMessage(config, content) {
    const cleanContent = content.trim();
    if (cleanContent.length === 0) {
        throw new Error("Discord message content is empty.");
    }
    if (cleanContent.length > 2_000) {
        throw new Error("Discord message content exceeds 2000 characters.");
    }
    if (!config.discord.enabled) {
        throw new Error("Discord is not configured. Run onboard with --discord-token-env and --discord-channel-id.");
    }
    const tokenEnv = config.discord.botTokenEnv;
    const channelId = config.discord.channelId;
    if (tokenEnv === undefined || tokenEnv.length === 0 || channelId === undefined || channelId.length === 0) {
        throw new Error("Discord config requires botTokenEnv and channelId.");
    }
    const token = await requireEnvValue(config.stateDir, tokenEnv, "using Discord");
    const payload = await postDiscordMessage(channelId, token, cleanContent);
    const id = extractDiscordMessageId(payload);
    const result = {
        id,
        channelId,
        content: cleanContent,
        createdAt: new Date().toISOString()
    };
    await ensureDir(config.logDir);
    await appendFile(join(config.logDir, "runtime.log"), `${result.createdAt} discord send id=${result.id} channel=${result.channelId}\n`, "utf8");
    return result;
}
async function postDiscordMessage(channelId, token, content) {
    const response = await fetch(`https://discord.com/api/v10/channels/${encodeURIComponent(channelId)}/messages`, {
        method: "POST",
        headers: {
            Authorization: `Bot ${token}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ content })
    });
    const text = await response.text();
    const payload = text.length > 0 ? parseJsonResponse(text) : {};
    if (!response.ok) {
        const details = extractDiscordError(payload) ?? text.slice(0, 500);
        throw new Error(`${response.status} ${response.statusText} from Discord: ${details}`);
    }
    return payload;
}
function parseJsonResponse(text) {
    try {
        return JSON.parse(text);
    }
    catch {
        throw new Error("Invalid JSON response from Discord.");
    }
}
function extractDiscordMessageId(payload) {
    if (isRecord(payload) && typeof payload.id === "string" && payload.id.length > 0) {
        return payload.id;
    }
    return "unknown";
}
function extractDiscordError(payload) {
    if (!isRecord(payload)) {
        return undefined;
    }
    if (typeof payload.message === "string") {
        return payload.message;
    }
    return undefined;
}
function isRecord(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}
//# sourceMappingURL=discord.js.map