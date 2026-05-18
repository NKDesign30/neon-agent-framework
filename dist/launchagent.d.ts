import type { INeonConfig } from "./types.js";
export interface ILaunchAgentInput {
    config: INeonConfig;
    nodePath: string;
    cliPath: string;
}
export interface IInstallLaunchAgentOptions extends ILaunchAgentInput {
    load: boolean;
}
export declare function launchAgentLabel(config: INeonConfig): string;
export declare function launchAgentPath(config: INeonConfig): string;
export declare function renderLaunchAgent(input: ILaunchAgentInput): string;
export declare function installLaunchAgent(options: IInstallLaunchAgentOptions): Promise<string>;
export declare function uninstallLaunchAgent(config: INeonConfig): Promise<string>;
export declare function restartLaunchAgent(config: INeonConfig): void;
