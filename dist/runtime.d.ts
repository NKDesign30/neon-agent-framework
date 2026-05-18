import type { INeonConfig } from "./types.js";
export interface IStartRuntimeOptions {
    once: boolean;
    prompt?: string;
}
export declare function startRuntime(config: INeonConfig, options: IStartRuntimeOptions): Promise<void>;
