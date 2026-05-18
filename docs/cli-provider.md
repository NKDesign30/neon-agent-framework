# Local Terminal Provider

Many users already have Claude Code or Codex logged in locally. The framework can route `neon run` through that terminal tool instead of requiring an API key.

## Claude Code

```bash
neon onboard --provider cli --model claude
neon run "Sag kurz hallo"
```

`neon run` shows a small progress indicator while the local CLI is working. Use `--no-progress` for scripts.

Default config:

```json
{
  "kind": "cli",
  "model": "claude",
  "command": "claude",
  "args": ["-p", "{prompt}"]
}
```

## Codex

```bash
neon onboard --provider cli --model codex --force
neon run "Sag kurz hallo"
```

Default config:

```json
{
  "kind": "cli",
  "model": "codex",
  "command": "codex",
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

For macOS LaunchAgent usage, prefer absolute command paths because launchd has a smaller `PATH` than your terminal.
