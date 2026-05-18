# Changelog

## 0.1.11 - 2026-05-18

- Resolve local CLI provider commands to absolute paths during onboarding when the tool is available.
- Add `neon doctor --fix` repair for old PATH-based CLI provider commands, so macOS LaunchAgents can run Claude/Codex reliably.

## 0.1.10 - 2026-05-18

- Remove the Claude GitHub Action workflow because it requires a GitHub secret for Anthropic API or Claude Code OAuth auth.
- Keep local terminal provider support as the default Claude/Codex path.

## 0.1.9 - 2026-05-18

- Add the Claude Code GitHub Action workflow for `@claude` issue and pull request comments.
- Add repository-level `CLAUDE.md` guardrails for public-safe AI changes.
- Document required GitHub app and `ANTHROPIC_API_KEY` setup.

## 0.1.8 - 2026-05-18

- Add `cli` provider support for local tools such as Claude Code and Codex.
- Add configurable CLI command and argument templates with `{prompt}` placeholder support.
- Add doctor checks for local CLI executables.
- Add an interactive progress indicator for long `neon run` calls.

## 0.1.7 - 2026-05-18

- Add install-time local SQLite memory database with FTS search.
- Add `neon memory init`, `neon memory add`, `neon memory search`, and `neon memory list`.
- Add `neon blueprint` plus public architecture, memory-core, and builder roadmap docs for the local owner AI.

## 0.1.6 - 2026-05-18

- Add file-backed local tasks with `neon task add`, `neon task list`, and `neon task complete`.
- Add explicit Discord sending with `neon discord send` using the configured bot token env and channel id.
- Share local state `.env` loading across provider, doctor, and Discord paths.

## 0.1.5 - 2026-05-18

- Switch GitHub installation to a packed tarball flow so npm consumes built `dist/*.js` output instead of a stale Git cache checkout.
- Add `neon run` and `neon start --prompt` for real provider-backed one-shot agent execution.
- Load provider keys from the local state `.env` as well as exported environment variables.
- Generate empty owner-controlled v3 workspace areas for agents, memory, tasks, skills, channels, approvals, and runs.

## 0.1.4 - 2026-05-18

- Make GitHub install preparation tolerate checked-in `dist/` and rebuild with `npx typescript` only when JavaScript output is missing.
- Pin install docs and installer script to `v0.1.4`.

## 0.1.3 - 2026-05-18

- Restore the GitHub install `prepare` build step so `npm install -g github:...` produces executable `dist/*.js` files.
- Pin install docs and installer script to the current release tag.
- Document recovery for stale npm Git caches that install declarations without JavaScript output.

## 0.1.2 - 2026-05-18

- Document npm global `PATH` troubleshooting for GitHub installs.

## 0.1.1 - 2026-05-18

- Commit built `dist/` output so GitHub installs work without TypeScript on the target machine.
- Remove the GitHub install `prepare` build step.
- Clarify GitHub install path before npm publishing.
- Run CI on `main`, `dev`, and feature/fix/chore branches.

## 0.1.0 - 2026-05-18

- Initial public-safe Neon Agent Framework scaffold.
- Add `neon onboard`, `neon doctor`, `neon start`, and `neon daemon` commands.
- Add starter workspace templates, GitHub install docs, installer script, and CI.
