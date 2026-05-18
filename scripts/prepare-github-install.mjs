#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";

if (existsSync("dist/cli.js")) {
  console.log("prepare: dist/cli.js already present");
  process.exit(0);
}

const npxBin = process.platform === "win32" ? "npx.cmd" : "npx";
console.log("prepare: dist/cli.js missing, building with TypeScript");
execFileSync(npxBin, ["--yes", "-p", "typescript@5.8.3", "tsc", "-p", "tsconfig.json"], {
  stdio: "inherit",
});
