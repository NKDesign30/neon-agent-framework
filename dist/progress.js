export async function withProgress(label, action) {
    if (!process.stdout.isTTY) {
        return action();
    }
    const startedAt = performance.now();
    const frames = ["-", "\\", "|", "/"];
    let index = 0;
    process.stdout.write(`${label}... ${frames[index]}`);
    const timer = setInterval(() => {
        index = (index + 1) % frames.length;
        const seconds = Math.max(1, Math.floor((performance.now() - startedAt) / 1_000));
        process.stdout.write(`\r${label}... ${frames[index]} ${seconds}s`);
    }, 250);
    try {
        const result = await action();
        const seconds = Math.max(1, Math.ceil((performance.now() - startedAt) / 1_000));
        process.stdout.write(`\r${label}... done ${seconds}s\n`);
        return result;
    }
    catch (error) {
        const seconds = Math.max(1, Math.ceil((performance.now() - startedAt) / 1_000));
        process.stdout.write(`\r${label}... failed ${seconds}s\n`);
        throw error;
    }
    finally {
        clearInterval(timer);
    }
}
//# sourceMappingURL=progress.js.map