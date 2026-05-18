export type ProviderKind = "openai" | "anthropic" | "openrouter" | "none";
export type ApprovalMode = "prompt" | "strict";
export interface IProviderConfig {
    kind: ProviderKind;
    model: string;
    apiKeyEnv?: string;
}
export interface IDiscordConfig {
    enabled: boolean;
    botTokenEnv?: string;
    channelId?: string;
}
export interface IApprovalPolicy {
    mode: ApprovalMode;
    directActions: string[];
    requireApprovalFor: string[];
}
export interface INeonConfig {
    version: 1;
    name: string;
    stateDir: string;
    workspaceDir: string;
    logDir: string;
    provider: IProviderConfig;
    discord: IDiscordConfig;
    approvalPolicy: IApprovalPolicy;
    createdAt: string;
    updatedAt: string;
}
export interface IDoctorCheck {
    id: string;
    ok: boolean;
    severity: "info" | "warning" | "error";
    message: string;
    fix?: string;
}
export interface IRuntimeStatus {
    name: string;
    pid: number;
    startedAt: string;
    stateDir: string;
    workspaceDir: string;
    provider: ProviderKind;
    model: string;
    approvalMode: ApprovalMode;
}
export interface ICliFlags {
    values: Record<string, string | boolean>;
    positional: string[];
}
