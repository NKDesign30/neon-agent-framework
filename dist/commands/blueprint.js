const BLUEPRINT = `Neon Agent Framework Builder Blueprint

Read in this order:
1. AGENTS.md
2. BUILDER.md
3. docs/architecture.md
4. docs/memory-core-spec.md
5. docs/builder-roadmap.md

Installed core:
- CLI onboarding, doctor, runtime, provider run
- SQLite memory database with FTS search
- local task queue
- explicit Discord send
- macOS LaunchAgent rendering/install
- empty workspace areas for agents, memory, tasks, skills, channels, approvals, runs

Next build order for the local owner AI:
1. Define owned agents in workspace/agents.
2. Add durable context with neon memory add/search.
3. Convert repeated workflows into workspace/skills.
4. Wire channel-specific policies in workspace/channels.
5. Keep approvals explicit before sending, pushing, deploying, or writing remote state.
`;
export async function runBlueprint(_flags) {
    console.log(BLUEPRINT.trimEnd());
}
//# sourceMappingURL=blueprint.js.map