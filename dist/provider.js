import { appendFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { ensureDir, writeJson } from "./fs.js";
import { requireEnvValue } from "./localEnv.js";
const DEFAULT_MAX_OUTPUT_TOKENS = 800;
export async function runAgentPrompt(config, prompt) {
    const cleanPrompt = prompt.trim();
    if (cleanPrompt.length === 0) {
        throw new Error("Prompt is empty.");
    }
    const startedAt = performance.now();
    const output = await callConfiguredProvider(config, cleanPrompt);
    const result = {
        id: crypto.randomUUID(),
        provider: config.provider.kind,
        model: config.provider.model,
        prompt: cleanPrompt,
        output,
        createdAt: new Date().toISOString(),
        durationMs: Math.round(performance.now() - startedAt)
    };
    await persistAgentRun(config, result);
    return result;
}
async function callConfiguredProvider(config, prompt) {
    switch (config.provider.kind) {
        case "none":
            return `Provider none received: ${prompt}`;
        case "openai":
            return callOpenAi(config, prompt);
        case "anthropic":
            return callAnthropic(config, prompt);
        case "openrouter":
            return callOpenRouter(config, prompt);
    }
}
async function callOpenAi(config, prompt) {
    const apiKey = await requireProviderApiKey(config);
    const payload = await postJson("https://api.openai.com/v1/responses", {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
    }, {
        model: config.provider.model,
        input: prompt,
        max_output_tokens: DEFAULT_MAX_OUTPUT_TOKENS
    });
    return requireTextOutput(payload, extractOpenAiText, "OpenAI response did not contain text output.");
}
async function callAnthropic(config, prompt) {
    const apiKey = await requireProviderApiKey(config);
    const payload = await postJson("https://api.anthropic.com/v1/messages", {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json"
    }, {
        model: config.provider.model,
        max_tokens: DEFAULT_MAX_OUTPUT_TOKENS,
        messages: [
            {
                role: "user",
                content: prompt
            }
        ]
    });
    return requireTextOutput(payload, extractContentText, "Anthropic response did not contain text output.");
}
async function callOpenRouter(config, prompt) {
    const apiKey = await requireProviderApiKey(config);
    const payload = await postJson("https://openrouter.ai/api/v1/chat/completions", {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
    }, {
        model: config.provider.model,
        max_tokens: DEFAULT_MAX_OUTPUT_TOKENS,
        messages: [
            {
                role: "user",
                content: prompt
            }
        ]
    });
    return requireTextOutput(payload, extractOpenRouterText, "OpenRouter response did not contain text output.");
}
async function requireProviderApiKey(config) {
    const apiKeyEnv = config.provider.apiKeyEnv;
    if (apiKeyEnv === undefined) {
        throw new Error(`Provider ${config.provider.kind} has no apiKeyEnv configured.`);
    }
    return requireEnvValue(config.stateDir, apiKeyEnv, "running the provider");
}
async function postJson(url, headers, body) {
    const response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(body)
    });
    const text = await response.text();
    const payload = text.length > 0 ? parseJsonResponse(text, url) : {};
    if (!response.ok) {
        const providerError = extractProviderError(payload);
        const details = providerError ?? text.slice(0, 500);
        throw new Error(`${response.status} ${response.statusText} from ${url}: ${details}`);
    }
    return payload;
}
function parseJsonResponse(text, url) {
    try {
        return JSON.parse(text);
    }
    catch {
        throw new Error(`Invalid JSON response from ${url}.`);
    }
}
function requireTextOutput(payload, extractor, message) {
    const text = extractor(payload);
    if (text !== undefined && text.trim().length > 0) {
        return text.trim();
    }
    throw new Error(message);
}
function extractOpenAiText(payload) {
    if (!isRecord(payload)) {
        return undefined;
    }
    if (isNonEmptyString(payload.output_text)) {
        return payload.output_text;
    }
    return extractContentText(payload.output);
}
function extractOpenRouterText(payload) {
    if (!isRecord(payload) || !Array.isArray(payload.choices)) {
        return undefined;
    }
    const [firstChoice] = payload.choices;
    if (!isRecord(firstChoice) || !isRecord(firstChoice.message)) {
        return undefined;
    }
    const content = firstChoice.message.content;
    return typeof content === "string" ? content : extractContentText(content);
}
function extractContentText(value) {
    const parts = collectTextParts(value);
    return parts.length > 0 ? parts.join("\n") : undefined;
}
function collectTextParts(value) {
    if (Array.isArray(value)) {
        return value.flatMap((item) => collectTextParts(item));
    }
    if (!isRecord(value)) {
        return [];
    }
    const text = value.text;
    if (typeof text === "string") {
        return [text];
    }
    const content = value.content;
    if (content !== undefined) {
        return collectTextParts(content);
    }
    return [];
}
function extractProviderError(payload) {
    if (!isRecord(payload)) {
        return undefined;
    }
    const error = payload.error;
    if (typeof error === "string") {
        return error;
    }
    if (isRecord(error)) {
        if (typeof error.message === "string") {
            return error.message;
        }
        if (typeof error.type === "string") {
            return error.type;
        }
    }
    if (typeof payload.message === "string") {
        return payload.message;
    }
    return undefined;
}
async function persistAgentRun(config, result) {
    const runsDir = join(config.stateDir, "runs");
    await ensureDir(runsDir);
    await writeJson(join(runsDir, `${result.id}.json`), result);
    await writeFile(join(config.stateDir, "last-run.txt"), `${result.createdAt} ${result.id} ${result.provider}/${result.model}\n`, "utf8");
    await appendFile(join(config.logDir, "runtime.log"), `${result.createdAt} agent run id=${result.id} provider=${result.provider} model=${result.model} durationMs=${result.durationMs}\n`, "utf8");
}
function isRecord(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}
function isNonEmptyString(value) {
    return typeof value === "string" && value.trim().length > 0;
}
//# sourceMappingURL=provider.js.map