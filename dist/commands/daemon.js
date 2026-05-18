import { fileURLToPath } from "node:url";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { defaultStateDir, loadConfig } from "../config.js";
import { installLaunchAgent, launchAgentLabel, launchAgentPath, renderLaunchAgent, restartLaunchAgent, uninstallLaunchAgent } from "../launchagent.js";
import { pathExists, resolvePath } from "../fs.js";
import { readBooleanFlag, readStringFlag } from "../args.js";
export async function runDaemon(flags) {
    const subcommand = flags.positional[0] ?? "status";
    const stateDir = resolvePath(readStringFlag(flags, "state-dir") ?? defaultStateDir());
    const config = await loadConfig(stateDir);
    switch (subcommand) {
        case "render": {
            console.log(renderLaunchAgent({ config, nodePath: process.execPath, cliPath: resolveCliPath() }));
            return;
        }
        case "install": {
            const plistPath = await installLaunchAgent({
                config,
                nodePath: process.execPath,
                cliPath: resolveCliPath(),
                load: !readBooleanFlag(flags, "no-load")
            });
            console.log(`Installed LaunchAgent: ${plistPath}`);
            return;
        }
        case "status": {
            const plistPath = launchAgentPath(config);
            console.log(`Label: ${launchAgentLabel(config)}`);
            console.log(`Plist: ${plistPath}`);
            console.log(`Installed: ${await pathExists(plistPath) ? "yes" : "no"}`);
            console.log(`Runtime log: ${join(config.logDir, "runtime.log")}`);
            return;
        }
        case "restart": {
            restartLaunchAgent(config);
            console.log("LaunchAgent restarted.");
            return;
        }
        case "logs": {
            await printLogs(config.logDir);
            return;
        }
        case "uninstall": {
            const plistPath = await uninstallLaunchAgent(config);
            console.log(`Removed LaunchAgent: ${plistPath}`);
            return;
        }
        default:
            throw new Error(`Unknown daemon command: ${subcommand}`);
    }
}
async function printLogs(logDir) {
    const paths = [join(logDir, "runtime.log"), join(logDir, "launchd.out.log"), join(logDir, "launchd.err.log")];
    for (const path of paths) {
        console.log(`==> ${path}`);
        if (!(await pathExists(path))) {
            console.log("(missing)");
            continue;
        }
        const contents = await readFile(path, "utf8");
        const lines = contents.trimEnd().split("\n").slice(-40);
        console.log(lines.join("\n"));
    }
}
function resolveCliPath() {
    const argPath = process.argv[1];
    if (argPath !== undefined && argPath.length > 0) {
        return argPath;
    }
    return fileURLToPath(new URL("../cli.js", import.meta.url));
}
//# sourceMappingURL=daemon.js.map