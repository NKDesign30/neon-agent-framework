# Agent Handoff Contract

Use this when one agent hands a task to another.

```text
Repo:
Branch:
Last commit:
Owner of next slice:

Do not touch:
- unrelated dirty files
- secrets
- files owned by another active agent

Already done:
- ...

Verified:
- command: result
- command: result

Open:
- ...

Next slice:
- goal:
- files:
- acceptance:
- verify:

If the slice gets bigger than expected, stop and report the smaller safe cut.
```

## Review Role

If another agent is actively coding, use review mode:

- read diff only
- run checks if safe
- report bugs with file/line evidence
- do not patch the same scope unless ownership is transferred
