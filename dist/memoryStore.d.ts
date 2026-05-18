import type { INeonConfig } from "./types.js";
export interface IMemoryRecord {
    id: string;
    title: string;
    body: string;
    tags: string[];
    source: string;
    createdAt: string;
    updatedAt: string;
}
export interface ICreateMemoryInput {
    title: string;
    body: string;
    tags: string[];
    source?: string;
}
export interface IMemorySearchResult extends IMemoryRecord {
    rank: number;
}
export interface IMemoryDatabaseInfo {
    path: string;
    ready: boolean;
}
export declare function memoryDatabasePath(config: INeonConfig): string;
export declare function initMemoryDatabase(config: INeonConfig): Promise<IMemoryDatabaseInfo>;
export declare function createMemory(config: INeonConfig, input: ICreateMemoryInput): Promise<IMemoryRecord>;
export declare function listMemories(config: INeonConfig, limit?: number): Promise<IMemoryRecord[]>;
export declare function searchMemories(config: INeonConfig, query: string, limit?: number): Promise<IMemorySearchResult[]>;
