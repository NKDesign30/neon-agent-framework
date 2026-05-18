import { join } from "node:path";
import { ensureDir, pathExists, readJsonUnknown, writeJson } from "./fs.js";
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

export async function createTask(config: INeonConfig, title: string): Promise<IAgentTask> {
  const cleanTitle = title.trim();
  if (cleanTitle.length === 0) {
    throw new Error("Task title is empty.");
  }

  const tasks = await listTasks(config);
  const now = new Date().toISOString();
  const task: IAgentTask = {
    id: crypto.randomUUID(),
    title: cleanTitle,
    status: "open",
    createdAt: now,
    updatedAt: now
  };

  await saveTasks(config, [...tasks, task]);
  return task;
}

export async function listTasks(config: INeonConfig): Promise<IAgentTask[]> {
  const path = tasksPath(config);
  if (!(await pathExists(path))) {
    return [];
  }

  const raw = await readJsonUnknown(path);
  if (!Array.isArray(raw)) {
    throw new Error(`Task store is not an array: ${path}`);
  }

  return raw.map((item) => parseTask(item, path));
}

export async function completeTask(config: INeonConfig, taskId: string): Promise<IAgentTask> {
  const cleanTaskId = taskId.trim();
  if (cleanTaskId.length === 0) {
    throw new Error("Task id is empty.");
  }

  const tasks = await listTasks(config);
  const index = tasks.findIndex((task) => task.id === cleanTaskId);
  if (index < 0) {
    throw new Error(`Task not found: ${cleanTaskId}`);
  }

  const existing = tasks[index];
  if (existing === undefined) {
    throw new Error(`Task not found: ${cleanTaskId}`);
  }

  const now = new Date().toISOString();
  const completed: IAgentTask = {
    ...existing,
    status: "done",
    updatedAt: now,
    completedAt: now
  };
  const next = tasks.slice();
  next[index] = completed;
  await saveTasks(config, next);
  return completed;
}

async function saveTasks(config: INeonConfig, tasks: readonly IAgentTask[]): Promise<void> {
  await ensureDir(join(config.stateDir, "tasks"));
  await writeJson(tasksPath(config), tasks);
}

function tasksPath(config: INeonConfig): string {
  return join(config.stateDir, "tasks", "tasks.json");
}

function parseTask(value: unknown, source: string): IAgentTask {
  if (!isRecord(value)) {
    throw new Error(`Invalid task in ${source}`);
  }

  const id = value.id;
  const title = value.title;
  const status = value.status;
  const createdAt = value.createdAt;
  const updatedAt = value.updatedAt;
  const completedAt = value.completedAt;
  if (!isNonEmptyString(id) || !isNonEmptyString(title) || !isTaskStatus(status) || !isNonEmptyString(createdAt) || !isNonEmptyString(updatedAt)) {
    throw new Error(`Invalid task in ${source}`);
  }

  return {
    id,
    title,
    status,
    createdAt,
    updatedAt,
    ...(completedAt !== undefined ? { completedAt: parseOptionalString(completedAt, source) } : {})
  };
}

function parseOptionalString(value: unknown, source: string): string {
  if (typeof value === "string") {
    return value;
  }

  throw new Error(`Invalid task completion timestamp in ${source}`);
}

function isTaskStatus(value: unknown): value is TaskStatus {
  return value === "open" || value === "done";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}
