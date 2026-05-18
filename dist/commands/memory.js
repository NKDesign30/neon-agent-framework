import { defaultStateDir, loadConfig } from "../config.js";
import { createMemory, initMemoryDatabase, listMemories, searchMemories } from "../memoryStore.js";
import { readBooleanFlag, readStringFlag } from "../args.js";
export async function runMemory(flags) {
    const config = await loadConfig(readStringFlag(flags, "state-dir") ?? defaultStateDir());
    const subcommand = flags.positional[0] ?? "search";
    switch (subcommand) {
        case "init": {
            const info = await initMemoryDatabase(config);
            if (readBooleanFlag(flags, "json")) {
                console.log(JSON.stringify(info, null, 2));
                return;
            }
            console.log(`Memory database ready: ${info.path}`);
            return;
        }
        case "add": {
            const source = readStringFlag(flags, "source");
            const memory = await createMemory(config, {
                title: readStringFlag(flags, "title") ?? "Untitled memory",
                body: readStringFlag(flags, "body") ?? flags.positional.slice(1).join(" "),
                tags: parseTags(readStringFlag(flags, "tags")),
                ...(source !== undefined ? { source } : {})
            });
            printMemoryResult(flags, memory);
            return;
        }
        case "list": {
            const memories = await listMemories(config, readLimit(flags));
            printMemoryList(flags, memories);
            return;
        }
        case "search": {
            const query = readStringFlag(flags, "query") ?? flags.positional.slice(1).join(" ");
            const results = await searchMemories(config, query, readLimit(flags));
            printMemorySearch(flags, results);
            return;
        }
        default:
            throw new Error(`Unknown memory command: ${subcommand}`);
    }
}
function printMemoryResult(flags, memory) {
    if (readBooleanFlag(flags, "json")) {
        console.log(JSON.stringify(memory, null, 2));
        return;
    }
    console.log(`${memory.id} ${memory.title}`);
}
function printMemoryList(flags, memories) {
    if (readBooleanFlag(flags, "json")) {
        console.log(JSON.stringify(memories, null, 2));
        return;
    }
    if (memories.length === 0) {
        console.log("No memories.");
        return;
    }
    for (const memory of memories) {
        console.log(`${memory.id} ${memory.title}`);
    }
}
function printMemorySearch(flags, results) {
    if (readBooleanFlag(flags, "json")) {
        console.log(JSON.stringify(results, null, 2));
        return;
    }
    if (results.length === 0) {
        console.log("No memory matches.");
        return;
    }
    for (const result of results) {
        console.log(`${result.id} ${result.title}`);
    }
}
function parseTags(value) {
    if (value === undefined) {
        return [];
    }
    return value.split(",").map((tag) => tag.trim()).filter((tag) => tag.length > 0);
}
function readLimit(flags) {
    const value = readStringFlag(flags, "limit");
    if (value === undefined) {
        return 20;
    }
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : 20;
}
//# sourceMappingURL=memory.js.map