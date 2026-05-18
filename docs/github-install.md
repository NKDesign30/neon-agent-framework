# GitHub Install

Before the first npm release, install from GitHub:

```bash
npm install -g github:NKDesign30/neon-agent-framework
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

The package has a `prepare` script so GitHub installs build `dist/` before the CLI bin is linked.
