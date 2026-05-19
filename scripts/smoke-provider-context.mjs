import { execFile } from "node:child_process";
import { chmod, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const root = process.cwd();
const cliPath = resolve(root, "dist/cli.js");
const tmpDir = resolve(root, ".tmp/provider-context-smoke");

async function runCli(args, options = {}) {
  return execFileAsync(process.execPath, [cliPath, ...args], { timeout: 10_000, ...options });
}

async function writeExecutable(filePath, body) {
  await writeFile(filePath, body);
  await chmod(filePath, 0o755);
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

async function smokeDoctorPreservesProvider() {
  const stateDir = join(tmpDir, "doctor-state");
  const workspaceDir = join(tmpDir, "doctor-workspace");
  const binDir = join(tmpDir, "bin");
  const logDir = join(stateDir, "logs");
  const fakeClaude = join(binDir, "claude");
  const fakeCodex = join(binDir, "codex");
  const now = new Date().toISOString();
  await mkdir(binDir, { recursive: true });
  await mkdir(workspaceDir, { recursive: true });
  await mkdir(logDir, { recursive: true });
  await writeExecutable(fakeClaude, "#!/usr/bin/env bash\nprintf 'claude'\n");
  await writeExecutable(fakeCodex, "#!/usr/bin/env bash\nprintf 'codex'\n");
  await writeFile(join(stateDir, "config.json"), `${JSON.stringify({
    version: 1,
    name: "provider-preserve-smoke",
    stateDir,
    workspaceDir,
    logDir,
    provider: {
      kind: "cli",
      model: "claude",
      command: fakeClaude,
      args: ["-p", "{prompt}"],
      fallback: {
        kind: "cli",
        model: "codex",
        command: fakeCodex,
        args: ["exec", "{prompt}"],
      },
    },
    discord: { enabled: false },
    approvalPolicy: {
      mode: "prompt",
      directActions: ["doctor", "status", "read-only-summary"],
      requireApprovalFor: ["send-message", "write-file", "run-command", "git-push", "deploy"],
    },
    createdAt: now,
    updatedAt: now,
  }, null, 2)}\n`);

  await runCli(["doctor", "--json", "--state-dir", stateDir, "--fix"]);
  const repaired = await readJson(join(stateDir, "config.json"));
  if (repaired.provider.model !== "claude" || repaired.provider.command !== fakeClaude) {
    throw new Error("doctor --fix replaced the primary provider.");
  }
  if (JSON.stringify(repaired.provider.args) !== JSON.stringify(["-p", "{prompt}"])) {
    throw new Error("doctor --fix modified primary provider args.");
  }
  if (repaired.provider.fallback?.model !== "codex" || repaired.provider.fallback.command !== fakeCodex) {
    throw new Error("doctor --fix removed or replaced the Codex fallback.");
  }
  if (!repaired.provider.fallback.args?.includes("--skip-git-repo-check")) {
    throw new Error("doctor --fix did not repair legacy Codex fallback args.");
  }
}

async function smokeRunContextScope() {
  const stateDir = join(tmpDir, "run-state");
  const workspaceDir = join(tmpDir, "run-workspace");
  await mkdir(workspaceDir, { recursive: true });
  await writeFile(join(workspaceDir, "AGENTS.md"), "workspace-only context\n", "utf8");
  await runCli([
    "onboard",
    "--non-interactive",
    "--force",
    "--state-dir",
    stateDir,
    "--workspace",
    workspaceDir,
    "--name",
    "context-scope-smoke",
    "--provider",
    "cli",
    "--model",
    "node-context",
    "--cli-command",
    process.execPath,
    "--cli-args-json",
    "[\"-e\",\"process.stdout.write(JSON.stringify({cwd:process.cwd(),prompt:process.argv[1]}))\",\"{prompt}\"]",
  ]);

  const defaultRun = JSON.parse((await runCli(["run", "--json", "--state-dir", stateDir, "hello"])).stdout);
  const defaultOutput = JSON.parse(defaultRun.output);
  if (defaultOutput.cwd !== workspaceDir) {
    throw new Error(`default run cwd mismatch: ${defaultOutput.cwd}`);
  }

  const scopedRun = JSON.parse((await runCli([
    "run",
    "--json",
    "--state-dir",
    stateDir,
    "--no-project-context",
    "--context-file",
    "AGENTS.md",
    "hello scoped",
  ])).stdout);
  const scopedOutput = JSON.parse(scopedRun.output);
  if (scopedOutput.cwd !== stateDir) {
    throw new Error(`--no-project-context cwd mismatch: ${scopedOutput.cwd}`);
  }
  if (!scopedOutput.prompt.includes("Context file: AGENTS.md") || !scopedOutput.prompt.includes("workspace-only context")) {
    throw new Error("--context-file was not included in the prompt.");
  }
  if (!scopedOutput.prompt.includes("User prompt:\nhello scoped")) {
    throw new Error("user prompt missing after context file.");
  }
}

await rm(tmpDir, { force: true, recursive: true });
await mkdir(tmpDir, { recursive: true });
await smokeDoctorPreservesProvider();
await smokeRunContextScope();
console.log("Provider context smoke passed.");
