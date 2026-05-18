import { defaultStateDir, loadConfig } from "../config.js";
import { completeTask, createTask, listTasks, type IAgentTask } from "../taskStore.js";
import { readBooleanFlag, readStringFlag, type ICliFlags } from "../args.js";

export async function runTask(flags: ICliFlags): Promise<void> {
  const config = await loadConfig(readStringFlag(flags, "state-dir") ?? defaultStateDir());
  const subcommand = flags.positional[0] ?? "list";

  switch (subcommand) {
    case "add": {
      const title = readStringFlag(flags, "title") ?? flags.positional.slice(1).join(" ");
      const task = await createTask(config, title);
      printTaskResult(flags, task);
      return;
    }
    case "complete": {
      const taskId = readStringFlag(flags, "id") ?? flags.positional[1] ?? "";
      const task = await completeTask(config, taskId);
      printTaskResult(flags, task);
      return;
    }
    case "list": {
      const tasks = await listTasks(config);
      if (readBooleanFlag(flags, "json")) {
        console.log(JSON.stringify(tasks, null, 2));
        return;
      }
      printTaskList(tasks);
      return;
    }
    default:
      throw new Error(`Unknown task command: ${subcommand}`);
  }
}

function printTaskResult(flags: ICliFlags, task: IAgentTask): void {
  if (readBooleanFlag(flags, "json")) {
    console.log(JSON.stringify(task, null, 2));
    return;
  }

  console.log(`${task.status} ${task.id} ${task.title}`);
}

function printTaskList(tasks: readonly IAgentTask[]): void {
  if (tasks.length === 0) {
    console.log("No tasks.");
    return;
  }

  for (const task of tasks) {
    console.log(`${task.status} ${task.id} ${task.title}`);
  }
}
