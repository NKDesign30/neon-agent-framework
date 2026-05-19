import { readFile, stat } from "node:fs/promises";
import { isAbsolute, join, relative } from "node:path";
import { defaultStateDir, loadConfig } from "../config.js";
import { withProgress } from "../progress.js";
import { runAgentPrompt } from "../provider.js";
import { readBooleanFlag, readStringFlag, type ICliFlags } from "../args.js";

const MAX_CONTEXT_FILE_BYTES = 128 * 1024;

export async function runPrompt(flags: ICliFlags): Promise<void> {
  const config = await loadConfig(readStringFlag(flags, "state-dir") ?? defaultStateDir());
  const prompt = readStringFlag(flags, "prompt") ?? flags.positional.join(" ");
  const json = readBooleanFlag(flags, "json");
  const showProgress = !json && !readBooleanFlag(flags, "no-progress");
  const noProjectContext = readBooleanFlag(flags, "no-project-context");
  const contextFile = readStringFlag(flags, "context-file");
  const effectivePrompt = await buildRunPrompt(config.workspaceDir, prompt, contextFile);
  const cwd = noProjectContext ? config.stateDir : config.workspaceDir;
  const result = showProgress
    ? await withProgress("Running agent job", () => runAgentPrompt(config, effectivePrompt, { cwd }))
    : await runAgentPrompt(config, effectivePrompt, { cwd });

  if (json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.log(result.output);
}

async function buildRunPrompt(workspaceDir: string, prompt: string, contextFile?: string): Promise<string> {
  if (contextFile === undefined) {
    return prompt;
  }

  const resolvedPath = isAbsolute(contextFile) ? contextFile : join(workspaceDir, contextFile);
  const fileStat = await stat(resolvedPath);
  if (!fileStat.isFile()) {
    throw new Error(`Context file is not a file: ${resolvedPath}`);
  }
  if (fileStat.size > MAX_CONTEXT_FILE_BYTES) {
    throw new Error(`Context file is too large: ${resolvedPath} (${fileStat.size} bytes, max ${MAX_CONTEXT_FILE_BYTES})`);
  }

  const context = await readFile(resolvedPath, "utf8");
  const label = isAbsolute(contextFile) ? resolvedPath : relative(workspaceDir, resolvedPath);
  return [
    `Context file: ${label}`,
    "```",
    context.trim(),
    "```",
    "",
    "User prompt:",
    prompt,
  ].join("\n");
}
