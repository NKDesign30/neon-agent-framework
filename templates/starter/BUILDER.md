# Builder Guide

This workspace is intentionally empty. Build your own agent system in this order:

1. Read `AGENTS.md`.
2. Run `neon blueprint`.
3. Add first owned memory:

```bash
neon memory add --title "Owner preference" --body "..."
neon memory search "preference"
```

4. Define agent roles in `agents/`.
5. Track work with `neon task add`.
6. Add channel policies in `channels/`.
7. Add repeatable workflows in `skills/`.

Do not paste another user's private memory database into this workspace.
