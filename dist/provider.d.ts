import type { INeonConfig, ProviderKind } from "./types.js";
export interface IAgentRunResult {
    id: string;
    provider: ProviderKind;
    model: string;
    prompt: string;
    output: string;
    createdAt: string;
    durationMs: number;
}
export interface IAgentRunOptions {
    cwd?: string;
}
export declare function runAgentPrompt(config: INeonConfig, prompt: string, options?: IAgentRunOptions): Promise<IAgentRunResult>;
