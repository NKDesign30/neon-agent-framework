export declare function readEnvValue(stateDir: string, key: string): Promise<string | undefined>;
export declare function requireEnvValue(stateDir: string, key: string, purpose: string): Promise<string>;
export declare function readStateEnv(stateDir: string): Promise<Record<string, string>>;
