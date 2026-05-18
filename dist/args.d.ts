import type { ICliFlags } from "./types.js";
export type { ICliFlags } from "./types.js";
export declare function parseFlags(args: string[]): ICliFlags;
export declare function readStringFlag(flags: ICliFlags, name: string): string | undefined;
export declare function readBooleanFlag(flags: ICliFlags, name: string): boolean;
export declare function hasFlag(flags: ICliFlags, name: string): boolean;
