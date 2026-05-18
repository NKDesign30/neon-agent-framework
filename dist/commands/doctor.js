import { access } from "node:fs/promises";
import { constants } from "node:fs";
import { join } from "node:path";
import { configPathForState, createConfig, defaultStateDir, defaultWorkspaceDir, loadConfig, saveConfig } from "../config.js";
import { ensureDir, pathExists, resolvePath } from "../fs.js";
import { launchAgentPath } from "../launchagent.js";
import { readBooleanFlag, readStringFlag } from "../args.js";
export async function runDoctor(flags) {
    const json = readBooleanFlag(flags, "json");
    const fix = readBooleanFlag(flags, "fix") || readBooleanFlag(flags, "repair");
    const stateDir = resolvePath(readStringFlag(flags, "state-dir") ?? defaultStateDir());
    const checks = [];
    checkNode(checks);
    if (fix) {
        await ensureDir(stateDir);
    }
    await checkWritableDir(checks, "state-dir", stateDir, fix);
    let config;
    try {
        config = await loadConfig(stateDir);
        checks.push(ok("config", `Config loaded: ${configPathForState(stateDir)}`));
    }
    catch (error) {
        if (fix) {
            config = createConfig({
                name: "neon-agent",
                stateDir,
                workspaceDir: defaultWorkspaceDir("neon-agent"),
                provider: "none"
            });
            await saveConfig(config);
            checks.push(ok("config", `Created default config: ${configPathForState(stateDir)}`));
        }
        else {
            checks.push(fail("config", formatError(error), "Run `neon onboard` or `neon doctor --fix`."));
        }
    }
    if (config !== undefined) {
        await checkWritableDir(checks, "workspace", config.workspaceDir, fix);
        await checkWritableDir(checks, "logs", config.logDir, fix);
        await checkEnvFile(checks, config, fix);
        await checkProvider(checks, config);
        await checkDiscord(checks, config);
        await checkLaunchAgent(checks, config);
    }
    if (json) {
        const okResult = checks.every((check) => check.ok || check.severity === "warning");
        const clean = checks.every((check) => check.ok);
        console.log(JSON.stringify({ ok: okResult, clean, checks }, null, 2));
    }
    else {
        printChecks(checks);
    }
    if (checks.some((check) => !check.ok && check.severity === "error")) {
        process.exitCode = 1;
    }
}
function checkNode(checks) {
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
async function checkWritableDir(checks, id, path, fix) {
    try {
        if (fix) {
            await ensureDir(path);
        }
        await access(path, constants.W_OK);
        checks.push(ok(id, `Writable: ${path}`));
    }
    catch {
        checks.push(fail(id, `Not writable: ${path}`, `Create it or run doctor with --fix.`));
    }
}
async function checkEnvFile(checks, config, fix) {
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
async function checkProvider(checks, config) {
    const apiKeyEnv = config.provider.apiKeyEnv;
    if (config.provider.kind === "none" || apiKeyEnv === undefined) {
        checks.push(warn("provider", "No model provider configured.", "Run `neon onboard --provider openai`."));
        return;
    }
    if (process.env[apiKeyEnv] !== undefined && process.env[apiKeyEnv]?.length !== 0) {
        checks.push(ok("provider", `${config.provider.kind} env is present: ${apiKeyEnv}`));
        return;
    }
    checks.push(warn("provider", `${config.provider.kind} env is missing: ${apiKeyEnv}`, `Export ${apiKeyEnv} before starting the runtime.`));
}
async function checkDiscord(checks, config) {
    if (!config.discord.enabled) {
        checks.push(warn("discord", "Discord is not configured.", "Run onboard with --discord-token-env and --discord-channel-id."));
        return;
    }
    const tokenEnv = config.discord.botTokenEnv;
    if (tokenEnv === undefined || tokenEnv.length === 0) {
        checks.push(fail("discord", "Discord enabled but botTokenEnv is missing.", "Set discord.botTokenEnv in config."));
        return;
    }
    if (process.env[tokenEnv] === undefined || process.env[tokenEnv]?.length === 0) {
        checks.push(warn("discord", `Discord token env is missing: ${tokenEnv}`, `Export ${tokenEnv} before using Discord.`));
        return;
    }
    checks.push(ok("discord", `Discord token env is present: ${tokenEnv}`));
}
async function checkLaunchAgent(checks, config) {
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
function printChecks(checks) {
    for (const check of checks) {
        const marker = check.ok ? "ok" : check.severity;
        console.log(`[${marker}] ${check.id}: ${check.message}`);
        if (!check.ok && check.fix !== undefined) {
            console.log(`      fix: ${check.fix}`);
        }
    }
}
function ok(id, message) {
    return { id, ok: true, severity: "info", message };
}
function warn(id, message, fix) {
    return { id, ok: false, severity: "warning", message, fix };
}
function fail(id, message, fix) {
    return { id, ok: false, severity: "error", message, fix };
}
function formatError(error) {
    return error instanceof Error ? error.message : String(error);
}
//# sourceMappingURL=doctor.js.map