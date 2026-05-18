# Public Architecture

This framework is a public-safe Neo-style starter runtime. It gives the local owner the same shape of system without private Neon data.

## Runtime Areas

- CLI: `neon` commands for setup, doctor checks, runtime smoke, memory, tasks, Discord, and daemon work.
- State: `~/.neon-agent` by default. Contains config, local `.env`, logs, runs, tasks, and memory DB.
- Workspace: `~/agent-name-workspace` by default. Contains owner-edited agents, memory notes, skills, channels, approvals, and builder docs.
- Provider: OpenAI, Anthropic, OpenRouter, local CLI tools, or `none`.
- Memory: local SQLite database with FTS search. It starts empty.
- Channels: explicit user-triggered adapters. No hidden listeners or auto-send policies.
- Daemon: macOS LaunchAgent generated from the local config.

## Safety Rules

- No private Neon memory, secrets, channels, customer context, or machine paths.
- The owner creates their own agents and context.
- Outbound actions stay explicit.
- Local CLI providers execute configured commands without shell interpolation.
- Human approval is required for sending, pushing, deploying, writing remote state, or destructive account actions.
