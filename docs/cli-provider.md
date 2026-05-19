# Local Terminal Provider

Many users already have Claude Code or Codex logged in locally. The framework can route `neon run` through that terminal tool instead of requiring an API key.

## Claude Code

```bash
neon onboard --provider cli --model claude
neon run "Sag kurz hallo"
```

`neon run` shows a small progress indicator while the local CLI is working. Use `--no-progress` for scripts.

Default config stores an absolute `command` path when the CLI is available during onboarding:

```json
{
  "kind": "cli",
  "model": "claude",
  "command": "/opt/homebrew/bin/claude",
  "args": ["-p", "{prompt}"],
  "fallback": {
    "kind": "cli",
    "model": "codex",
    "command": "/opt/homebrew/bin/codex",
    "args": ["exec", "{prompt}"]
  }
}
```

The fallback is optional. If Claude Code times out or exits with an error, the runtime retries the same prompt through the fallback CLI and records the actual model used in the run log.

## Codex

```bash
neon onboard --provider cli --model codex --force
neon run "Sag kurz hallo"
```

Default config stores an absolute `command` path when the CLI is available during onboarding:

```json
{
  "kind": "cli",
  "model": "codex",
  "command": "/opt/homebrew/bin/codex",
  "args": ["exec", "{prompt}"]
}
```

## Custom CLI

Use a command plus a JSON string array for args. `{prompt}` is replaced with the user prompt. If no `{prompt}` placeholder exists, the prompt is appended as the last arg.

```bash
neon onboard \
  --provider cli \
  --model local-tool \
  --cli-command /usr/local/bin/my-agent \
  --cli-args-json '["run", "--text", "{prompt}"]'
```

For older configs that still contain `"command": "claude"` or `"command": "codex"`, run:

```bash
neon doctor --fix
```

That stores the absolute command path for macOS LaunchAgent usage. launchd has a smaller `PATH` than your terminal.

For Claude Code configs, `doctor --fix` also adds a Codex fallback when the `codex` command is executable. Existing custom fallback commands are repaired to absolute paths the same way.
