import { execFile } from "node:child_process";
import { chmod, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const root = process.cwd();
const cliPath = resolve(root, "dist/cli.js");
const stateDir = resolve(root, ".tmp/cli-fallback-state");
const workspaceDir = resolve(root, ".tmp/cli-fallback-workspace");
const fakeBinDir = resolve(root, ".tmp/cli-fallback-bin");
const fakeCodexPath = resolve(fakeBinDir, "codex");
const configPath = resolve(stateDir, "config.json");

await rm(stateDir, { force: true, recursive: true });
await rm(workspaceDir, { force: true, recursive: true });
await rm(fakeBinDir, { force: true, recursive: true });
await mkdir(fakeBinDir, { recursive: true });
await writeFile(fakeCodexPath, "#!/usr/bin/env bash\nprintf '%s' \"$*\"\n");
await chmod(fakeCodexPath, 0o755);

await execFileAsync(process.execPath, [
  cliPath,
  "onboard",
  "--non-interactive",
  "--state-dir",
  stateDir,
  "--workspace",
  workspaceDir,
  "--name",
  "cli-fallback-smoke",
  "--provider",
  "cli",
  "--model",
  "claude",
  "--cli-command",
  process.execPath,
  "--cli-args-json",
  "[\"-e\",\"setTimeout(() => {}, 5000)\"]"
]);

const doctorEnv = {
  ...process.env,
  PATH: `${fakeBinDir}:${process.env.PATH ?? ""}`
};
await execFileAsync(process.execPath, [cliPath, "doctor", "--json", "--state-dir", stateDir, "--fix"], { env: doctorEnv });

const repairedConfig = JSON.parse(await readFile(configPath, "utf8"));
if (repairedConfig.provider?.fallback?.model !== "codex") {
  throw new Error("doctor --fix did not install the Codex CLI fallback.");
}
if (!repairedConfig.provider.fallback.args?.includes("--skip-git-repo-check")) {
  throw new Error("doctor --fix installed Codex fallback without --skip-git-repo-check.");
}

repairedConfig.provider.fallback.args = ["exec", "{prompt}"];
await writeFile(configPath, `${JSON.stringify(repairedConfig, null, 2)}\n`);
await execFileAsync(process.execPath, [cliPath, "doctor", "--json", "--state-dir", stateDir, "--fix"], { env: doctorEnv });
const rerepairedConfig = JSON.parse(await readFile(configPath, "utf8"));
if (!rerepairedConfig.provider?.fallback?.args?.includes("--skip-git-repo-check")) {
  throw new Error("doctor --fix did not repair legacy Codex fallback args.");
}

rerepairedConfig.provider.timeoutMs = 50;
rerepairedConfig.provider.fallback = {
  kind: "cli",
  model: "codex-smoke",
  command: process.execPath,
  args: ["-e", "process.stdout.write(process.argv[1])", "{prompt}"],
  timeoutMs: 5000
};
await writeFile(configPath, `${JSON.stringify(rerepairedConfig, null, 2)}\n`);

const { stdout } = await execFileAsync(process.execPath, [
  cliPath,
  "run",
  "--state-dir",
  stateDir,
  "--json",
  "fallback ok"
], { timeout: 10_000 });

const runResult = JSON.parse(stdout);
if (runResult.output !== "fallback ok") {
  throw new Error(`CLI fallback smoke did not return fallback output: ${stdout}`);
}

if (runResult.model !== "codex-smoke") {
  throw new Error(`CLI fallback smoke did not record fallback model: ${stdout}`);
}

console.log("CLI fallback smoke passed.");
