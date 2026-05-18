import type { INeonConfig } from "./types.js";
export interface IStartRuntimeOptions {
    once: boolean;
}
export declare function startRuntime(config: INeonConfig, options: IStartRuntimeOptions): Promise<void>;
