# Builder Roadmap

Use this order when the local owner AI continues building the system.

## 1. Identity

Create owned agent profiles in `agents/`.

Acceptance:
- `agents/main.md` exists.
- It defines role, tone, boundaries, approval rules, and owner-specific context.

## 2. Memory

Use the installed memory DB before building complex routing.

Commands:

```bash
neon memory add --title "Owner preference" --body "..."
neon memory search "preference"
```

Acceptance:
- Search returns the added memory.
- No secrets are stored.

## 3. Tasks

Use `neon task` for local work tracking.

Acceptance:
- New tasks can be added, listed, and completed.

## 4. Skills

Move repeated workflows into `skills/`.

Acceptance:
- Each skill states inputs, outputs, required tools, and safety boundaries.

## 5. Channels

Start with explicit sends, then add listeners only with a clear approval policy.

Acceptance:
- Discord send works only after config.
- No auto-send loop exists by default.

## 6. Daemon

Install the LaunchAgent after the local smoke checks pass.

Acceptance:
- `neon daemon status` points to the local config and logs.
