import { access } from "node:fs/promises";
import { constants } from "node:fs";
import { join } from "node:path";
import { configPathForState, createConfig, defaultCliArgsForModel, defaultStateDir, defaultWorkspaceDir, loadConfig, saveConfig } from "../config.js";
import { isExplicitCommandPath, resolveExecutable } from "../commandResolver.js";
import { ensureDir, pathExists, resolvePath } from "../fs.js";
import { launchAgentPath } from "../launchagent.js";
import { readEnvValue } from "../localEnv.js";
import { initMemoryDatabase, memoryDatabasePath } from "../memoryStore.js";
import { readBooleanFlag, readStringFlag, type ICliFlags } from "../args.js";
import { copyStarterWorkspaceMissing } from "../starterWorkspace.js";
import type { ICliProviderFallbackConfig, IDoctorCheck, INeonConfig } from "../types.js";

export async function runDoctor(flags: ICliFlags): Promise<void> {
  const json = readBooleanFlag(flags, "json");
  const fix = readBooleanFlag(flags, "fix") || readBooleanFlag(flags, "repair");
  const stateDir = resolvePath(readStringFlag(flags, "state-dir") ?? defaultStateDir());
  const checks: IDoctorCheck[] = [];

  checkNode(checks);

  if (fix) {
    await ensureDir(stateDir);
  }

  await checkWritableDir(checks, "state-dir", stateDir, fix);

  let config: INeonConfig | undefined;
  try {
    config = await loadConfig(stateDir);
    checks.push(ok("config", `Config loaded: ${configPathForState(stateDir)}`));
  } catch (error) {
    if (fix) {
      config = createConfig({
        name: "neon-agent",
        stateDir,
        workspaceDir: defaultWorkspaceDir("neon-agent"),
        provider: "none"
      });
      await saveConfig(config);
      checks.push(ok("config", `Created default config: ${configPathForState(stateDir)}`));
    } else {
      checks.push(fail("config", formatError(error), "Run `neon onboard` or `neon doctor --fix`."));
    }
  }

  if (config !== undefined) {
    await checkWritableDir(checks, "workspace", config.workspaceDir, fix);
    await checkStarterWorkspace(checks, config, fix);
    await checkWritableDir(checks, "logs", config.logDir, fix);
    await checkEnvFile(checks, config, fix);
    await checkMemory(checks, config, fix);
    await checkProvider(checks, config, fix);
    await checkDiscord(checks, config);
    await checkLaunchAgent(checks, config);
  }

  if (json) {
    const okResult = checks.every((check) => check.ok || check.severity === "warning");
    const clean = checks.every((check) => check.ok);
    console.log(JSON.stringify({ ok: okResult, clean, checks }, null, 2));
  } else {
    printChecks(checks);
  }

  if (checks.some((check) => !check.ok && check.severity === "error")) {
    process.exitCode = 1;
  }
}

async function checkStarterWorkspace(checks: IDoctorCheck[], config: INeonConfig, fix: boolean): Promise<void> {
  const required = [
    "AGENTS.md",
    "BUILDER.md",
    "OPERATING.md",
    "channels/discord-operating-floor.md",
    "agents/handoff-contract.md"
  ];
  const missing: string[] = [];

  for (const file of required) {
    if (!(await pathExists(join(config.workspaceDir, file)))) {
      missing.push(file);
    }
  }

  if (missing.length === 0) {
    checks.push(ok("starter-workspace", "Starter workspace playbooks are installed."));
    return;
  }

  if (!fix) {
    checks.push(warn(
      "starter-workspace",
      `Starter workspace is missing: ${missing.join(", ")}`,
      "Run `neon doctor --fix` to install missing starter playbooks without overwriting existing files."
    ));
    return;
  }

  const copied = await copyStarterWorkspaceMissing(config.workspaceDir);
  checks.push(ok(
    "starter-workspace",
    copied.length > 0
      ? `Installed missing starter files: ${copied.join(", ")}`
      : "Starter workspace playbooks are installed."
  ));
}

function checkNode(checks: IDoctorCheck[]): void {
  const version = process.versions.node;
  const [majorRaw, minorRaw] = version.split(".");
  const major = Number.parseInt(majorRaw ?? "0", 10);
  const minor = Number.parseInt(minorRaw ?? "0", 10);
  const okVersion = major > 22 || (major === 22 && minor >= 16);

  if (okVersion) {
    checks.push(ok("node", `Node ${version}`));
    return;
  }

  checks.push(fail("node", `Node ${version} is too old`, "Install Node 22.16+ or Node 24."));
}

async function checkWritableDir(checks: IDoctorCheck[], id: string, path: string, fix: boolean): Promise<void> {
  try {
    if (fix) {
      await ensureDir(path);
    }
    await access(path, constants.W_OK);
    checks.push(ok(id, `Writable: ${path}`));
  } catch {
    checks.push(fail(id, `Not writable: ${path}`, `Create it or run doctor with --fix.`));
  }
}

async function checkEnvFile(checks: IDoctorCheck[], config: INeonConfig, fix: boolean): Promise<void> {
  const envPath = join(config.stateDir, ".env");
  if (await pathExists(envPath)) {
    checks.push(ok("env", `Env file exists: ${envPath}`));
    return;
  }

  if (fix) {
    checks.push(warn("env", `Env file missing: ${envPath}`, "Run `neon onboard` to create provider/channel hints."));
    return;
  }

  checks.push(warn("env", `Env file missing: ${envPath}`, "Run `neon onboard` or copy `.env.example`."));
}

async function checkProvider(checks: IDoctorCheck[], config: INeonConfig, fix: boolean): Promise<void> {
  if (config.provider.kind === "cli") {
    await checkCliProvider(checks, config, fix);
    return;
  }

  const apiKeyEnv = config.provider.apiKeyEnv;
  if (config.provider.kind === "none" || apiKeyEnv === undefined) {
    checks.push(warn("provider", "No model provider configured.", "Run `neon onboard --provider cli --model claude` or `neon onboard --provider openai`."));
    return;
  }

  const stateEnvValue = await readEnvValue(config.stateDir, apiKeyEnv);
  if (stateEnvValue !== undefined && stateEnvValue.length > 0) {
    checks.push(ok("provider", `${config.provider.kind} env is present: ${apiKeyEnv}`));
    return;
  }

  checks.push(warn("provider", `${config.provider.kind} env is missing: ${apiKeyEnv}`, `Add ${apiKeyEnv}=... to ${join(config.stateDir, ".env")} or export it before starting the runtime.`));
}

async function checkCliProvider(checks: IDoctorCheck[], config: INeonConfig, fix: boolean): Promise<void> {
  const command = config.provider.command;
  if (command === undefined || command.trim().length === 0) {
    checks.push(fail("provider", "CLI provider command is missing.", "Run `neon onboard --provider cli --model claude --force`."));
    return;
  }

  let configChanged = false;
  const resolvedCommand = await resolveExecutable(command);
  if (resolvedCommand === undefined) {
    checks.push(fail("provider", `CLI provider command not found or not executable: ${command}`, "Install the CLI or set an absolute command with `--cli-command`."));
    return;
  }

  checks.push(ok("provider", `CLI provider command is executable: ${resolvedCommand}`));

  if (!isExplicitCommandPath(command)) {
    if (fix) {
      config.provider.command = resolvedCommand;
      configChanged = true;
      checks.push(ok("provider-path", `Stored absolute CLI provider command: ${resolvedCommand}`));
    } else {
      checks.push(warn("provider-path", `CLI provider command is resolved through PATH: ${command}`, "Use an absolute `--cli-command` for daemon usage, for example `--cli-command \"$(command -v claude)\"`."));
    }
  }

  configChanged = (await checkCliFallback(checks, config, fix)) || configChanged;
  if (configChanged) {
    config.updatedAt = new Date().toISOString();
    await saveConfig(config);
  }
}

async function checkCliFallback(checks: IDoctorCheck[], config: INeonConfig, fix: boolean): Promise<boolean> {
  const fallback = config.provider.fallback;
  if (fallback !== undefined) {
    return checkConfiguredCliFallback(checks, config, fallback, fix);
  }

  if (!isClaudeCliProvider(config)) {
    return false;
  }

  if (!fix) {
    checks.push(warn("provider-fallback", "Codex CLI fallback is not configured for Claude.", "Run `neon doctor --fix` after installing Codex CLI."));
    return false;
  }

  const codexCommand = "codex";
  const resolvedCodex = await resolveExecutable(codexCommand);
  if (resolvedCodex === undefined) {
    checks.push(warn("provider-fallback", "Codex CLI fallback is not available.", "Install Codex CLI, then run `neon doctor --fix` again."));
    return false;
  }

  config.provider.fallback = {
    kind: "cli",
    model: "codex",
    command: resolvedCodex,
    args: defaultCliArgsForModel("codex")
  };
  checks.push(ok("provider-fallback", `Stored Codex CLI fallback: ${resolvedCodex}`));
  return true;
}

async function checkConfiguredCliFallback(checks: IDoctorCheck[], config: INeonConfig, fallback: ICliProviderFallbackConfig, fix: boolean): Promise<boolean> {
  const resolvedCommand = await resolveExecutable(fallback.command);
  if (resolvedCommand === undefined) {
    checks.push(warn("provider-fallback", `CLI fallback command not found or not executable: ${fallback.command}`, "Install the fallback CLI or update provider.fallback.command."));
    return false;
  }

  checks.push(ok("provider-fallback", `CLI fallback command is executable: ${resolvedCommand}`));
  let changed = false;
  let nextFallback = fallback;

  if (!isExplicitCommandPath(fallback.command) && !fix) {
    checks.push(warn("provider-fallback-path", `CLI fallback command is resolved through PATH: ${fallback.command}`, "Run `neon doctor --fix` to store an absolute fallback command for daemon usage."));
  } else if (!isExplicitCommandPath(fallback.command)) {
    nextFallback = {
      ...nextFallback,
      command: resolvedCommand
    };
    checks.push(ok("provider-fallback-path", `Stored absolute CLI fallback command: ${resolvedCommand}`));
    changed = true;
  }

  const repairedArgs = repairCodexCliArgs(nextFallback.model, nextFallback.args);
  if (repairedArgs !== undefined && !fix) {
    checks.push(warn("provider-fallback-args", "Codex CLI fallback args are missing --skip-git-repo-check.", "Run `neon doctor --fix` to repair Codex fallback args."));
  } else if (repairedArgs !== undefined) {
    nextFallback = {
      ...nextFallback,
      args: repairedArgs
    };
    checks.push(ok("provider-fallback-args", "Stored Codex CLI fallback args with --skip-git-repo-check."));
    changed = true;
  }

  if (!changed) {
    return false;
  }

  config.provider.fallback = nextFallback;
  return true;
}

function repairCodexCliArgs(model: string, args?: string[]): string[] | undefined {
  const normalizedModel = model.trim().toLowerCase();
  if (normalizedModel !== "codex" && normalizedModel !== "codex-cli") {
    return undefined;
  }
  if (args === undefined) {
    return defaultCliArgsForModel("codex");
  }
  const resolvedArgs = args;
  if (resolvedArgs[0] !== "exec" || resolvedArgs.includes("--skip-git-repo-check")) {
    return undefined;
  }
  const promptIndex = resolvedArgs.indexOf("{prompt}");
  if (promptIndex < 0) {
    return undefined;
  }
  const nextArgs = [...resolvedArgs];
  nextArgs.splice(promptIndex, 0, "--skip-git-repo-check");
  return nextArgs;
}

function isClaudeCliProvider(config: INeonConfig): boolean {
  const model = config.provider.model.toLowerCase();
  const command = config.provider.command?.toLowerCase() ?? "";
  return model.includes("claude") || command.includes("claude");
}

async function checkMemory(checks: IDoctorCheck[], config: INeonConfig, fix: boolean): Promise<void> {
  const dbPath = memoryDatabasePath(config);
  if (fix) {
    await initMemoryDatabase(config);
  }

  if (await pathExists(dbPath)) {
    checks.push(ok("memory", `Memory database exists: ${dbPath}`));
    return;
  }

  checks.push(warn("memory", `Memory database missing: ${dbPath}`, "Run `neon memory init` or `neon doctor --fix`."));
}

async function checkDiscord(checks: IDoctorCheck[], config: INeonConfig): Promise<void> {
  if (!config.discord.enabled) {
    checks.push(warn("discord", "Discord is not configured.", "Run onboard with --discord-token-env and --discord-channel-id."));
    return;
  }

  const tokenEnv = config.discord.botTokenEnv;
  if (tokenEnv === undefined || tokenEnv.length === 0) {
    checks.push(fail("discord", "Discord enabled but botTokenEnv is missing.", "Set discord.botTokenEnv in config."));
    return;
  }

  const stateEnvValue = await readEnvValue(config.stateDir, tokenEnv);
  if (stateEnvValue !== undefined && stateEnvValue.length > 0) {
    checks.push(ok("discord", `Discord token env is present: ${tokenEnv}`));
    return;
  }

  checks.push(warn("discord", `Discord token env is missing: ${tokenEnv}`, `Add ${tokenEnv}=... to ${join(config.stateDir, ".env")} or export it before using Discord.`));
}

async function checkLaunchAgent(checks: IDoctorCheck[], config: INeonConfig): Promise<void> {
  if (process.platform !== "darwin") {
    checks.push(warn("daemon", "LaunchAgent is macOS-only.", "Use systemd or Docker supervisor on Linux."));
    return;
  }

  const plistPath = launchAgentPath(config);
  if (await pathExists(plistPath)) {
    checks.push(ok("daemon", `LaunchAgent exists: ${plistPath}`));
    return;
  }

  checks.push(warn("daemon", `LaunchAgent not installed: ${plistPath}`, "Run `neon daemon install`."));
}

function printChecks(checks: IDoctorCheck[]): void {
  for (const check of checks) {
    const marker = check.ok ? "ok" : check.severity;
    console.log(`[${marker}] ${check.id}: ${check.message}`);
    if (!check.ok && check.fix !== undefined) {
      console.log(`      fix: ${check.fix}`);
    }
  }
}

function ok(id: string, message: string): IDoctorCheck {
  return { id, ok: true, severity: "info", message };
}

function warn(id: string, message: string, fix: string): IDoctorCheck {
  return { id, ok: false, severity: "warning", message, fix };
}

function fail(id: string, message: string, fix: string): IDoctorCheck {
  return { id, ok: false, severity: "error", message, fix };
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
