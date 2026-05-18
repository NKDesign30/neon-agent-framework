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
export declare function runAgentPrompt(config: INeonConfig, prompt: string): Promise<IAgentRunResult>;
