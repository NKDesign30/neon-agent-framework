# Builder Guide

This workspace is intentionally empty. Build your own agent system in this order:

1. Read `AGENTS.md`.
2. Read `OPERATING.md`.
3. Run `neon blueprint`.
4. Add first owned memory:

```bash
neon memory add --title "Owner preference" --body "..."
neon memory search "preference"
```

5. Define agent roles in `agents/`.
6. Track work with `neon task add`.
7. Add channel policies in `channels/`.
8. Add repeatable workflows in `skills/`.

Do not paste another user's private memory database into this workspace.
