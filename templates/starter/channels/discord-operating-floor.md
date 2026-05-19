# Discord Operating Floor

Use this when the workspace owner wires a Discord bot or Discord-like chat channel.

## Reply Style

- Answer simple greetings directly.
- For questions, use a short "I am checking..." style only when you actually need context or verification.
- For tasks, acknowledge the task with the concrete phase: checking files, building, testing, blocked, or done.
- Avoid noisy generic status messages.
- Keep raw logs local. Discord gets the summary and the next action.

## Intent Routing

Route messages by intent before choosing a model or workflow:

| Intent | Default action |
|---|---|
| Greeting or check-in | Brief direct reply |
| Context question | Search workspace memory/docs, then answer |
| Small command | Execute if safe and local |
| Code task | Plan, patch, verify, report |
| File conversion or document task | Create/convert the file and attach or report the path |
| Approval request | Ask the owner clearly before external action |
| Ambiguous group chatter | Stay quiet unless addressed or the policy says to answer |

## Progress Updates

For work that lasts more than a short moment:

- Send a first concrete update after the task is understood.
- Send follow-up updates when the phase changes.
- Do not stream every token or terminal line into Discord.
- Surface meaningful tool progress, test results, blockers, and final delivery.

Good update:

```text
Ich prüfe gerade den Installer-Pfad und die Starter-Templates. Wenn das passt, baue ich es als Framework-Default statt als privaten Runtime-Hack.
```

Bad update:

```text
Ich denke nach...
```

## Safety Defaults

- No secrets in messages.
- No destructive account actions without approval.
- No hidden auto-send policy.
- No broad file dumps.
- No fake success when a file could not be created or attached.

## Delivery Contract

When a task produces output:

- Prefer the real output file over a description.
- If a file cannot be sent, give a local path and the exact blocker.
- If a run fails, mention the failed command/test by name and keep raw details in local logs.
