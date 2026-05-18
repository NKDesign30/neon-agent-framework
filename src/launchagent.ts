import { execFileSync } from "node:child_process";
import { chmod, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { homedir } from "node:os";
import { ensureDir, pathExists } from "./fs.js";
import type { INeonConfig } from "./types.js";

export interface ILaunchAgentInput {
  config: INeonConfig;
  nodePath: string;
  cliPath: string;
}

export interface IInstallLaunchAgentOptions extends ILaunchAgentInput {
  load: boolean;
}

export function launchAgentLabel(config: INeonConfig): string {
  const safeName = config.name.toLowerCase().replace(/[^a-z0-9.-]+/g, "-").replace(/^-|-$/g, "");
  return `dev.neon.agent.${safeName || "runtime"}`;
}

export function launchAgentPath(config: INeonConfig): string {
  return join(homedir(), "Library", "LaunchAgents", `${launchAgentLabel(config)}.plist`);
}

export function renderLaunchAgent(input: ILaunchAgentInput): string {
  const label = launchAgentLabel(input.config);
  const stdoutPath = join(input.config.logDir, "launchd.out.log");
  const stderrPath = join(input.config.logDir, "launchd.err.log");

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${xmlEscape(label)}</string>
  <key>ProgramArguments</key>
  <array>
    <string>${xmlEscape(input.nodePath)}</string>
    <string>${xmlEscape(input.cliPath)}</string>
    <string>start</string>
    <string>--state-dir</string>
    <string>${xmlEscape(input.config.stateDir)}</string>
  </array>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>StandardOutPath</key>
  <string>${xmlEscape(stdoutPath)}</string>
  <key>StandardErrorPath</key>
  <string>${xmlEscape(stderrPath)}</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>NEON_AGENT_STATE_DIR</key>
    <string>${xmlEscape(input.config.stateDir)}</string>
  </dict>
</dict>
</plist>
`;
}

export async function installLaunchAgent(options: IInstallLaunchAgentOptions): Promise<string> {
  if (process.platform !== "darwin") {
    throw new Error("LaunchAgent install is only supported on macOS");
  }

  const plistPath = launchAgentPath(options.config);
  await ensureDir(options.config.logDir);
  await ensureDir(join(homedir(), "Library", "LaunchAgents"));
  await writeFile(plistPath, renderLaunchAgent(options), "utf8");
  await chmod(plistPath, 0o644);

  if (options.load) {
    loadLaunchAgent(plistPath);
  }

  return plistPath;
}

export async function uninstallLaunchAgent(config: INeonConfig): Promise<string> {
  const plistPath = launchAgentPath(config);
  if (process.platform === "darwin" && (await pathExists(plistPath))) {
    unloadLaunchAgent(plistPath);
  }

  await rm(plistPath, { force: true });
  return plistPath;
}

export function restartLaunchAgent(config: INeonConfig): void {
  if (process.platform !== "darwin") {
    throw new Error("LaunchAgent restart is only supported on macOS");
  }

  const label = launchAgentLabel(config);
  execFileSync("launchctl", ["kickstart", "-k", `gui/${currentUid()}/${label}`], { stdio: "inherit" });
}

function loadLaunchAgent(plistPath: string): void {
  execFileSync("launchctl", ["bootstrap", `gui/${currentUid()}`, plistPath], { stdio: "inherit" });
}

function unloadLaunchAgent(plistPath: string): void {
  try {
    execFileSync("launchctl", ["bootout", `gui/${currentUid()}`, plistPath], { stdio: "ignore" });
  } catch {
    // launchctl returns non-zero if the agent was not loaded. The plist removal still matters.
  }
}

function currentUid(): number {
  const uid = process.getuid?.();
  if (uid === undefined) {
    throw new Error("Cannot resolve current uid");
  }

  return uid;
}

function xmlEscape(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}
