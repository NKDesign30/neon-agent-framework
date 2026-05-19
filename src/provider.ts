import { spawn } from "node:child_process";
import { appendFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { defaultCliArgsForModel } from "./config.js";
import { ensureDir, writeJson } from "./fs.js";
import { requireEnvValue } from "./localEnv.js";
import type { ICliProviderFallbackConfig, INeonConfig, ProviderKind } from "./types.js";

const DEFAULT_MAX_OUTPUT_TOKENS = 800;
const DEFAULT_CLI_TIMEOUT_MS = 120_000;

export interface IAgentRunResult {
  id: string;
  provider: ProviderKind;
  model: string;
  prompt: string;
  output: string;
  createdAt: string;
  durationMs: number;
}

interface IProviderCallResult {
  provider: ProviderKind;
  model: string;
  output: string;
}

export async function runAgentPrompt(config: INeonConfig, prompt: string): Promise<IAgentRunResult> {
  const cleanPrompt = prompt.trim();
  if (cleanPrompt.length === 0) {
    throw new Error("Prompt is empty.");
  }

  const startedAt = performance.now();
  const providerResult = await callConfiguredProvider(config, cleanPrompt);
  const result: IAgentRunResult = {
    id: crypto.randomUUID(),
    provider: providerResult.provider,
    model: providerResult.model,
    prompt: cleanPrompt,
    output: providerResult.output,
    createdAt: new Date().toISOString(),
    durationMs: Math.round(performance.now() - startedAt)
  };

  await persistAgentRun(config, result);
  return result;
}

async function callConfiguredProvider(config: INeonConfig, prompt: string): Promise<IProviderCallResult> {
  switch (config.provider.kind) {
    case "none":
      return {
        provider: "none",
        model: config.provider.model,
        output: `Provider none received: ${prompt}`
      };
    case "openai":
      return {
        provider: "openai",
        model: config.provider.model,
        output: await callOpenAi(config, prompt)
      };
    case "anthropic":
      return {
        provider: "anthropic",
        model: config.provider.model,
        output: await callAnthropic(config, prompt)
      };
    case "openrouter":
      return {
        provider: "openrouter",
        model: config.provider.model,
        output: await callOpenRouter(config, prompt)
      };
    case "cli":
      return callCli(config, prompt);
  }
}

async function callCli(config: INeonConfig, prompt: string): Promise<IProviderCallResult> {
  const command = config.provider.command;
  if (command === undefined || command.trim().length === 0) {
    throw new Error("CLI provider command is missing.");
  }

  const templateArgs = config.provider.args ?? defaultCliArgsForModel(config.provider.model);
  const timeoutMs = config.provider.timeoutMs ?? DEFAULT_CLI_TIMEOUT_MS;
  try {
    return await callCliCommand(command, templateArgs, config.provider.model, prompt, config.workspaceDir, timeoutMs);
  } catch (error) {
    const fallback = config.provider.fallback;
    if (fallback === undefined) {
      throw error;
    }

    try {
      return await callCliFallback(fallback, prompt, config.workspaceDir, timeoutMs);
    } catch (fallbackError) {
      throw new Error(`CLI provider failed and fallback failed. Primary: ${formatProviderError(error)} Fallback: ${formatProviderError(fallbackError)}`);
    }
  }
}

async function callCliFallback(fallback: ICliProviderFallbackConfig, prompt: string, cwd: string, primaryTimeoutMs: number): Promise<IProviderCallResult> {
  return callCliCommand(fallback.command, fallback.args ?? defaultCliArgsForModel(fallback.model), fallback.model, prompt, cwd, fallback.timeoutMs ?? primaryTimeoutMs);
}

async function callCliCommand(command: string, templateArgs: readonly string[], model: string, prompt: string, cwd: string, timeoutMs: number): Promise<IProviderCallResult> {
  const args = expandCliArgs(templateArgs, prompt);
  const result = await execCli(command, args, cwd, timeoutMs);
  if (result.stdout.trim().length > 0) {
    return {
      provider: "cli",
      model,
      output: result.stdout.trim()
    };
  }
  if (result.stderr.trim().length > 0) {
    return {
      provider: "cli",
      model,
      output: result.stderr.trim()
    };
  }

  throw new Error("CLI provider returned no output.");
}

async function callOpenAi(config: INeonConfig, prompt: string): Promise<string> {
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

async function callAnthropic(config: INeonConfig, prompt: string): Promise<string> {
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

async function callOpenRouter(config: INeonConfig, prompt: string): Promise<string> {
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

async function requireProviderApiKey(config: INeonConfig): Promise<string> {
  const apiKeyEnv = config.provider.apiKeyEnv;
  if (apiKeyEnv === undefined) {
    throw new Error(`Provider ${config.provider.kind} has no apiKeyEnv configured.`);
  }

  return requireEnvValue(config.stateDir, apiKeyEnv, "running the provider");
}

async function postJson(url: string, headers: Record<string, string>, body: unknown): Promise<unknown> {
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

function expandCliArgs(args: readonly string[], prompt: string): string[] {
  let usedPromptPlaceholder = false;
  const expanded = args.map((arg) => {
    if (!arg.includes("{prompt}")) {
      return arg;
    }

    usedPromptPlaceholder = true;
    return arg.replaceAll("{prompt}", prompt);
  });

  return usedPromptPlaceholder ? expanded : [...expanded, prompt];
}

interface ICliResult {
  stdout: string;
  stderr: string;
}

async function execCli(command: string, args: readonly string[], cwd: string, timeoutMs: number): Promise<ICliResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      env: process.env,
      shell: false,
      stdio: ["ignore", "pipe", "pipe"]
    });
    let stdout = "";
    let stderr = "";
    let timedOut = false;

    const timeout = setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");
    }, timeoutMs);

    child.stdout.on("data", (chunk: Buffer | string) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk: Buffer | string) => {
      stderr += chunk.toString();
    });
    child.once("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child.once("close", (code, signal) => {
      clearTimeout(timeout);
      if (timedOut) {
        reject(new Error(`CLI provider timed out after ${timeoutMs}ms: ${command}`));
        return;
      }

      if (code !== 0) {
        const details = trimCliError(stderr.length > 0 ? stderr : stdout);
        reject(new Error(`CLI provider exited with ${code ?? signal ?? "unknown"}: ${details}`));
        return;
      }

      resolve({ stdout, stderr });
    });
  });
}

function trimCliError(value: string): string {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed.slice(0, 1_000) : "no output";
}

function formatProviderError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function parseJsonResponse(text: string, url: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new Error(`Invalid JSON response from ${url}.`);
  }
}

function requireTextOutput(payload: unknown, extractor: (payload: unknown) => string | undefined, message: string): string {
  const text = extractor(payload);
  if (text !== undefined && text.trim().length > 0) {
    return text.trim();
  }

  throw new Error(message);
}

function extractOpenAiText(payload: unknown): string | undefined {
  if (!isRecord(payload)) {
    return undefined;
  }

  if (isNonEmptyString(payload.output_text)) {
    return payload.output_text;
  }

  return extractContentText(payload.output);
}

function extractOpenRouterText(payload: unknown): string | undefined {
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

function extractContentText(value: unknown): string | undefined {
  const parts = collectTextParts(value);
  return parts.length > 0 ? parts.join("\n") : undefined;
}

function collectTextParts(value: unknown): string[] {
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

function extractProviderError(payload: unknown): string | undefined {
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

async function persistAgentRun(config: INeonConfig, result: IAgentRunResult): Promise<void> {
  const runsDir = join(config.stateDir, "runs");
  await ensureDir(runsDir);
  await writeJson(join(runsDir, `${result.id}.json`), result);
  await writeFile(join(config.stateDir, "last-run.txt"), `${result.createdAt} ${result.id} ${result.provider}/${result.model}\n`, "utf8");
  await appendFile(join(config.logDir, "runtime.log"), `${result.createdAt} agent run id=${result.id} provider=${result.provider} model=${result.model} durationMs=${result.durationMs}\n`, "utf8");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}
