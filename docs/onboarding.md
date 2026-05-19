# Onboarding Contract

The onboarding flow should let a new user create an owned agent instance without seeing private Neon internals.

## Steps

1. Check Node version and writable state paths.
2. Create `~/.neon-agent/config.json`.
3. Create `~/.neon-agent/.env` from the public example.
4. Create a workspace with starter docs and empty owner-controlled v3 areas.
5. Ask for the model access path: `local`, `api`, or `none`.
6. For `local`, choose `claude`, `codex`, or `custom`.
7. For `api`, choose `openai`, `anthropic`, or `openrouter`.
8. Configure provider selection by env var reference or local CLI command.
9. Configure Discord token env name and target channel.
10. Set approval defaults.
11. Run doctor and report next commands.

## Workspace Shape

The generated workspace is intentionally empty but v3-shaped:

- `agents/` for owned agent personalities and routing notes.
- `memory/` for the user's own context, summaries, and indexes.
- `tasks/` for local task specs and run state.
- `skills/` for local command wrappers and repeatable workflows.
- `channels/` for Discord, mail, WhatsApp, or other adapters.
- `approvals/` for human approval records.
- `runs/` for prompt/run artifacts.
- `OPERATING.md` for public-safe task triage, updates, approvals, and handoff rules.
- `channels/discord-operating-floor.md` for Discord-style message routing and progress behavior.
- `agents/handoff-contract.md` for multi-agent continuation without branch conflicts.

## Non-Goals

- No private Neon memory export.
- No private agent souls.
- No customer context.
- No hidden auto-send policies.
- No direct copy from a private runtime repo.
- No prefilled opinions about the user's own agents, projects, or channels.

## First Runtime Checks

```bash
neon run "Sag kurz hallo"
neon onboard --provider cli --model claude
neon run "Sag kurz hallo über Claude CLI"
neon memory add --title "Erste Erinnerung" --body "Mein Agent ist installiert."
neon memory search "installiert"
neon task add "Erste eigene Aufgabe"
neon task list
```

Long provider calls show a small terminal progress indicator by default. Scripts can disable it with `neon run --no-progress "..."`.

Discord is explicit and user-triggered:

```bash
neon discord send "Agent ist installiert."
```

Before enabling a live Discord bot, read `channels/discord-operating-floor.md` in the generated workspace. It keeps greetings lightweight, tasks visible, raw logs local, and external actions approval-first.

## Existing Installations

For a workspace that was created before these starter files existed, update the CLI and run:

```bash
neon doctor --fix
```

Doctor installs missing starter playbooks only. It does not overwrite owner-edited workspace files.
