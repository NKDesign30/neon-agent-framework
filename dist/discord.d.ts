import type { INeonConfig } from "./types.js";
export interface IDiscordSendResult {
    id: string;
    channelId: string;
    content: string;
    createdAt: string;
}
export declare function sendDiscordMessage(config: INeonConfig, content: string): Promise<IDiscordSendResult>;
