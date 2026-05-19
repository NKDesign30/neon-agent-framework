# GitHub Install

Before the first npm release, install with the public installer:

```bash
curl -fsSL https://raw.githubusercontent.com/NKDesign30/neon-agent-framework/main/scripts/install.sh | bash
neon onboard
neon doctor
neon run "Sag kurz hallo"
neon task add "Erste eigene Aufgabe"
```

For local testing from a checkout:

```bash
git clone https://github.com/NKDesign30/neon-agent-framework.git
cd neon-agent-framework
npm ci
npm run build
npm link
neon onboard
```

The repository includes the built `dist/` output, but direct `npm install -g github:...` is not the recommended consumer path. Some npm versions install from a stale Git cache, leave `dist/cli.js` missing, or fail with `ENOTEMPTY` when an old global package directory blocks npm's rename step. The installer cleans the old `neon-agent-framework` global package directory, packs the current main ref first, and installs that tarball.

## `neon` Command Not Found

If npm reports that the package was added but `neon` is not found, add the npm global bin directory to your shell path:

```bash
NPM_PREFIX="$(npm config get prefix)"
ls -la "$NPM_PREFIX/bin/neon"
"$NPM_PREFIX/bin/neon" --help

echo "export PATH=\"$NPM_PREFIX/bin:\$PATH\"" >> ~/.zshrc
export PATH="$NPM_PREFIX/bin:$PATH"
hash -r

neon --help
```

## Missing `dist/cli.js`

If npm reports success but the generated `neon` command points at a missing `dist/cli.js`, the npm Git cache likely kept a broken checkout. Reinstall from current main with a clean cache:

```bash
npm cache clean --force
curl -fsSL https://raw.githubusercontent.com/NKDesign30/neon-agent-framework/main/scripts/install.sh | bash -s -- --no-onboard
neon --help
```

## Old Global Directory Blocks Install

If npm fails with `ENOTEMPTY: directory not empty, rename .../node_modules/neon-agent-framework`, do not retry direct `npm install -g github:...`. Use the installer; it removes only the stale Neon package directories under npm's global root and leaves unrelated packages alone:

```bash
curl -fsSL https://raw.githubusercontent.com/NKDesign30/neon-agent-framework/main/scripts/install.sh | bash -s -- --no-onboard
neon --help
```
