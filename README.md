# Neon Agent Framework

Public-safe Neon-style agent framework: runtime, onboarding, doctor checks, approvals, Discord wiring, and daemon tooling.

This is not a copy of a private Neon system. It contains no private memories, souls, tokens, customer context, local machine paths, or internal automations.

## Install

```bash
npm install -g neon-agent-framework
neon onboard --install-daemon
```

Install from GitHub before an npm release:

```bash
npm install -g github:NKDesign30/neon-agent-framework
neon onboard
```

Local development:

```bash
npm install
npm run build
node dist/cli.js onboard
```

## Quick Start

```bash
neon onboard
neon doctor
neon start
```

Non-interactive setup for Docker/CI:

```bash
neon onboard \
  --non-interactive \
  --name martin-agent \
  --provider openai \
  --discord-token-env DISCORD_BOT_TOKEN \
  --discord-channel-id 123456789
```

## Commands

```bash
neon onboard              # create config, env, workspace, starter files
neon doctor               # validate local setup
neon start                # run the local runtime
neon daemon install       # install macOS LaunchAgent
neon daemon status        # inspect daemon config
neon daemon restart       # restart LaunchAgent
neon daemon logs          # print log paths
neon daemon uninstall     # remove LaunchAgent
```

## Safety Defaults

- Actions default to approval-first.
- No direct sending without a configured channel and explicit policy.
- No main/master workflow assumptions.
- Secrets stay in env vars or local state, never in the repo.
- The daemon is generated from the local user's config.

## Repo Shape

```txt
packages later, core now:
  src/
    commands/
    config.ts
    launchagent.ts
    runtime.ts
  templates/starter/
  examples/basic-discord-agent/
  scripts/install.sh
```

## Development

```bash
npm run check
npm run build
npm run smoke
```

See [GitHub install](docs/github-install.md) before publishing the first release.
