# GitHub Install

Before the first npm release, install from a packed GitHub tarball:

```bash
TMP_DIR="$(mktemp -d)"
(cd "$TMP_DIR" && npm pack github:NKDesign30/neon-agent-framework#v0.1.11 --silent)
npm install -g "$TMP_DIR"/neon-agent-framework-0.1.11.tgz
rm -rf "$TMP_DIR"
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

The repository includes the built `dist/` output, but direct `npm install -g github:...` is not the recommended consumer path. Some npm versions install from a stale Git cache and create a global `neon` symlink that points at a missing `dist/cli.js`. Packing first makes npm consume the same tarball shape that a registry release would use.

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

If npm reports success but the generated `neon` command points at a missing `dist/cli.js`, the npm Git cache likely kept a broken checkout. Reinstall the current tag from a clean cache:

```bash
npm uninstall -g neon-agent-framework || true
npm cache clean --force
curl -fsSL https://raw.githubusercontent.com/NKDesign30/neon-agent-framework/main/scripts/install.sh | bash -s -- --no-onboard
neon --help
```
