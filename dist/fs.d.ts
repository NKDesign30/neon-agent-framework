export declare function expandHome(input: string): string;
export declare function resolvePath(input: string): string;
export declare function pathExists(path: string): Promise<boolean>;
export declare function ensureDir(path: string): Promise<void>;
export declare function ensureWritableDir(path: string): Promise<void>;
export declare function readJsonUnknown(path: string): Promise<unknown>;
export declare function writeJson(path: string, value: unknown): Promise<void>;
export declare function writeFileIfMissing(path: string, contents: string): Promise<boolean>;
export declare function copyDirectoryMissing(sourceDir: string, targetDir: string): Promise<string[]>;
