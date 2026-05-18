# GitHub Install

Before the first npm release, install from GitHub:

```bash
npm install -g github:NKDesign30/neon-agent-framework#v0.1.3
neon onboard
neon doctor
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

The repository includes the built `dist/` output and a `prepare` build step so GitHub installs produce executable `.js` files.

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
npm install -g github:NKDesign30/neon-agent-framework#v0.1.3
"$(npm config get prefix)/bin/neon" --help
```
