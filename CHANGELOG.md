# Changelog

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
