# Claude Instructions

This repository is the public Neon Agent Framework. Keep every change public-safe.

## Rules

- Never add private Neon memory, customer context, tokens, local machine paths, or personal data.
- Keep changes small and reviewable.
- Use TypeScript strict patterns. Do not introduce `any`.
- Prefer named exports.
- Keep installer, package version, docs, and changelog aligned for user-facing behavior changes.
- Do not auto-merge or push unrelated branches.

## Verify

Run the relevant checks before reporting done:

```bash
npm run check
npm run build
npm run smoke
```
