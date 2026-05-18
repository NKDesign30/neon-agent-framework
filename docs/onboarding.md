# Onboarding Contract

The onboarding flow should let a new user create an owned agent instance without seeing private Neon internals.

## Steps

1. Check Node version and writable state paths.
2. Create `~/.neon-agent/config.json`.
3. Create `~/.neon-agent/.env` from the public example.
4. Create a workspace with starter docs.
5. Configure provider selection by env var reference.
6. Configure Discord token env name and target channel.
7. Set approval defaults.
8. Run doctor and report next commands.

## Non-Goals

- No private Neon memory export.
- No private agent souls.
- No customer context.
- No hidden auto-send policies.
- No direct copy from a private runtime repo.
