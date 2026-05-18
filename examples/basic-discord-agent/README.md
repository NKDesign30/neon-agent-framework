# Basic Discord Agent

Minimal flow:

```bash
export DISCORD_BOT_TOKEN=...
neon onboard \
  --non-interactive \
  --name basic-discord-agent \
  --provider openai \
  --discord-token-env DISCORD_BOT_TOKEN \
  --discord-channel-id 123456789

neon doctor
neon start
```

The runtime is intentionally approval-first. Add real actions only after `doctor` is clean.
