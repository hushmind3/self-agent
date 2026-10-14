# Autonomous Agent Workspace

```text
.git/
node_modules/   # Shared pnpm package store (ignored by Git)
.venv/          # Shared Python environment (ignored by Git)
package.json
pnpm-workspace.yaml
backend/
frontend/
Paperclip/
Hermes/
```

Requires Node.js 24.11 or newer, pnpm 9.15.4, and uv.

## Install and run (Windows)

```powershell
pnpm install
pnpm hermes:install
pnpm hermes --help
pnpm paperclip:dev
```

Paperclip development defaults to http://localhost:3100. Configure providers through Hermes setup before using a model.

The pnpm package store lives in root node_modules/.pnpm; workspace packages also have node_modules folders containing dependency links. Python packages are installed in the root .venv. backend and frontend are placeholders for your application.

## GitHub

The entire tree is managed by one root Git repository. UPSTREAM.json records the original repositories and imported commits. Keep the upstream license files and notices in Hermes/ and Paperclip/. Dependencies, virtual environments, .env secrets, local runtime data, and build output are excluded by .gitignore. pnpm-lock.yaml should be committed after installation. GitHub repository: https://github.com/hushmind3/self-agent.

Windows compatibility: the vendored Paperclip SDK linker uses directory junctions, so installing dependencies does not require Developer Mode or administrator symlink privileges.

Paperclip package scripts use Git Bash (C:/Program Files/Git/bin/bash.exe), configured in .npmrc, for portable mkdir/cp/chmod commands on Windows.
