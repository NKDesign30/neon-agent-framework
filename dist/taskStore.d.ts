import type { INeonConfig } from "./types.js";
export type TaskStatus = "open" | "done";
export interface IAgentTask {
    id: string;
    title: string;
    status: TaskStatus;
    createdAt: string;
    updatedAt: string;
    completedAt?: string;
}
export declare function createTask(config: INeonConfig, title: string): Promise<IAgentTask>;
export declare function listTasks(config: INeonConfig): Promise<IAgentTask[]>;
export declare function completeTask(config: INeonConfig, taskId: string): Promise<IAgentTask>;
