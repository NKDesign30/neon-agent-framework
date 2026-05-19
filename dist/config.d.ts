import type { ApprovalMode, INeonConfig, ProviderKind } from "./types.js";
export interface ICreateConfigInput {
    name: string;
    stateDir: string;
    workspaceDir: string;
    provider: ProviderKind;
    model?: string;
    cliCommand?: string;
    cliArgs?: string[];
    discordTokenEnv?: string;
    discordChannelId?: string;
    approvalMode?: ApprovalMode;
}
export declare function defaultStateDir(): string;
export declare function configPathForState(stateDir: string): string;
export declare function defaultWorkspaceDir(name: string): string;
export declare function defaultModelForProvider(provider: ProviderKind): string;
export declare function apiKeyEnvForProvider(provider: ProviderKind): string | undefined;
export declare function defaultCliCommandForModel(model: string): string;
export declare function defaultCliArgsForModel(model: string): string[];
export declare function createConfig(input: ICreateConfigInput): INeonConfig;
export declare function saveConfig(config: INeonConfig): Promise<string>;
export declare function loadConfig(stateDirInput?: string): Promise<INeonConfig>;
export declare function parseConfig(raw: unknown, source: string): INeonConfig;
export declare function envTemplate(): string;
