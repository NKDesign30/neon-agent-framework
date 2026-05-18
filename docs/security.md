# Security Defaults

The framework assumes real messaging surfaces are untrusted.

## Defaults

- Unknown inbound users are not trusted by default.
- Outbound communication should be draft or approval-first.
- High-risk actions require explicit approval.
- Secrets are env references, not config values.
- Generated daemon files point to local user state only.

## Recommended Policies

Use `approvalPolicy.mode = "prompt"` for local development and `approvalPolicy.mode = "strict"` for shared systems.

Never publish:

- real token values
- user memory databases
- customer data
- local absolute paths from a private machine
- private Discord guild/channel IDs
