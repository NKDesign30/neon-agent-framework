# Neon Agent Framework

Public-safe Neon-style agent framework: runtime, onboarding, doctor checks, approvals, Discord wiring, and daemon tooling.

This is not a copy of a private Neon system. It contains no private memories, souls, tokens, customer context, local machine paths, or internal automations.

## Install

Install with the public installer:

```bash
curl -fsSL https://raw.githubusercontent.com/NKDesign30/neon-agent-framework/main/scripts/install.sh | bash
```

Manual GitHub install before the npm release:

```bash
TMP_DIR="$(mktemp -d)"
(cd "$TMP_DIR" && npm pack github:NKDesign30/neon-agent-framework#v0.1.11 --silent)
npm install -g "$TMP_DIR"/neon-agent-framework-0.1.11.tgz
rm -rf "$TMP_DIR"
```

Direct `npm install -g github:...` is intentionally not the primary path because npm can install from a stale Git cache and leave `dist/cli.js` missing. The installer packs the tagged repo first and installs that tarball.

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
neon blueprint
neon run "Sag kurz hallo"
neon memory add --title "Erste Erinnerung" --body "Mein Agent ist installiert."
neon memory search "installiert"
neon task add "Erste eigene Aufgabe"
neon start
```

The interactive onboarding first asks how the model should run:

- `local`: existing terminal tools like Claude Code or Codex.
- `api`: API-key backed providers like OpenAI, Anthropic, or OpenRouter.
- `none`: install the framework without model calls first.

Local terminal setup, like Claude Code or Codex users usually run:

```bash
neon onboard --provider cli --model claude
neon run "Sag kurz hallo"

neon onboard --provider cli --model codex --force
neon run "Sag kurz hallo"
```

Onboarding stores an absolute CLI command path when `claude` or `codex` is available. For older configs, repair it once before installing the daemon:

```bash
neon doctor --fix
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
neon blueprint            # print builder roadmap for the local owner AI
neon run "prompt"         # run one provider-backed prompt
neon run --no-progress "prompt" # run without the interactive progress indicator
neon memory init          # create the local SQLite memory database
neon memory add ...       # add owned context
neon memory search ...    # search owned context
neon task add "title"     # create a local task
neon task list            # list local tasks
neon task complete <id>   # complete a local task
neon discord send "text"  # send an explicit Discord message
neon start                # run the local runtime
neon start --prompt "..." # start runtime and run a prompt smoke
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
- CLI providers call local tools without shell expansion.
- Long `neon run` calls show a small progress indicator by default.
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
See [CLI provider](docs/cli-provider.md) for Claude Code, Codex, and custom local tools.

## Troubleshooting

If installation succeeds but `neon` is not found, your npm global bin directory is missing from `PATH`:

```bash
NPM_PREFIX="$(npm config get prefix)"
"$NPM_PREFIX/bin/neon" --help
echo "export PATH=\"$NPM_PREFIX/bin:\$PATH\"" >> ~/.zshrc
export PATH="$NPM_PREFIX/bin:$PATH"
hash -r
neon --help
```

If `dist/cli.js` is missing after a GitHub install, clear the local Git install cache and reinstall the current tag:

```bash
npm uninstall -g neon-agent-framework || true
npm cache clean --force
curl -fsSL https://raw.githubusercontent.com/NKDesign30/neon-agent-framework/main/scripts/install.sh | bash -s -- --no-onboard
```
