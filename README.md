# Reflog

![Reflog Screenshot](./public/screenshots/01-welcome.png)

A modern desktop Git client built with **Tauri 2**, **React 19**, and **Rust** — focused on conflict resolution, history visualization, and workflow automations.

---

## 🏷️ Badges

![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)
![Tauri](https://img.shields.io/badge/Tauri-2-24c8db?style=flat-square&logo=tauri&logoColor=white)
![React](https://img.shields.io/badge/React-19-61dafb?style=flat-square&logo=react&logoColor=white)
![Rust](https://img.shields.io/badge/Rust-2021-f74c00?style=flat-square&logo=rust&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-7-3178c6?style=flat-square&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-6-646cff?style=flat-square&logo=vite&logoColor=white)
![Biome](https://img.shields.io/badge/Formatter-Biome-60a5fa?style=flat-square&logo=biome&logoColor=white)

---

## ✨ Features

| Category | Features |
| ---------- | ---------- |
| 📁 **Repository** | Open, clone, initialize, recents, superproject/submodule switcher |
| 📦 **Staging** | Add, unstage, discard (per file, per hunk, per selection), commit, amend |
| 📊 **History** | Log, graph (DAG), blame, diff, reflog, file history |
| 🔎 **Search** | Server-side `git log` filters: author, message, path, pickaxe, date range |
| 🔀 **Compare** | Merge base, per-file stats, ahead/behind commits, full diff between refs |
| ⚔️ **Conflicts** | Visual merge tool, cherry-pick, revert, interactive rebase |
| 🔄 **Sync** | Push, force-push (`--force-with-lease`), push tags, delete remote branch, pull, fetch (per remote, optional prune), upstream management, stash, submodules |
| 🌿 **Branches/Tags** | Create (from any ref), delete (with force), rename, merge, tag |
| ↩️ **Undo** | `Ctrl+Z` / `Ctrl+Shift+Z` over a bounded stack of reversible actions |
| ⚙️ **Automations** | Commit templates, recipes, monitors, quick actions |
| 🛠️ **Settings** | Git config editor (allow-listed keys), identity profiles, GPG status, remotes |

---

## 🛠 Tech Stack

### Frontend

| Tech | Version | Purpose |
| ------ | --------- | --------- |
| ![React](https://img.shields.io/badge/React-19-61dafb?logo=react&logoColor=white) | 19 | UI library |
| ![TypeScript](https://img.shields.io/badge/TypeScript-7-3178c6?logo=typescript&logoColor=white) | 7 | Type safety |
| ![Vite](https://img.shields.io/badge/Vite-6-646cff?logo=vite&logoColor=white) | 6 | Build tool & dev server |
| ![React Router](https://img.shields.io/badge/React_Router-7-ca4245?logo=reactrouter&logoColor=white) | 7 | Routing |
| ![Sass](https://img.shields.io/badge/Sass-1-cc6699?logo=sass&logoColor=white) | 1 | Styling |
| ![Zod](https://img.shields.io/badge/Zod-4-3e67b1?logo=zod&logoColor=white) | 4 | Schema validation |
| ![Lucide](https://img.shields.io/badge/Lucide_React-latest-f56565?logo=lucide&logoColor=white) | - | Icons |
| ![Lowlight](https://img.shields.io/badge/Lowlight-3-ff6b35?logo=highlight.js&logoColor=white) | 3 | Syntax highlighting |

### Backend (Rust/Tauri)

| Tech | Version | Purpose |
| ------ | --------- | --------- |
| ![Tauri](https://img.shields.io/badge/Tauri-2-24c8db?logo=tauri&logoColor=white) | 2 | Desktop framework |
| ![Rust](https://img.shields.io/badge/Rust-2021-f74c00?logo=rust&logoColor=white) | 2021 | Systems language |
| `tauri-plugin-fs` | 2 | File system access |
| `tauri-plugin-dialog` | 2 | Native dialogs |
| `tauri-plugin-cli` | 2 | CLI arguments |
| `serde` | 1 | Serialization |

---

## 📁 Project Structure

```txt
reflog/
├── doc/                    # Documentation
├── public/                 # Static assets
├── src/                    # Frontend (React + TypeScript)
│   ├── presentation/       # Presentation layer
│   │   ├── components/     # Reusable components
│   │   ├── pages/          # Pages/Routes
│   │   ├── layout/         # Layouts
│   │   ├── context/        # React Context providers
│   │   └── hooks/          # Custom hooks
│   ├── domain/             # Domain layer
│   │   └── entities/       # Business entities
│   ├── infrastructure/     # Infrastructure layer
│   ├── data/               # Use-cases + singletons
│   ├── shared/             # Shared code
│   ├── routes.tsx          # Route configuration
│   └── main.tsx            # Entry point
├── src-tauri/              # Backend (Rust)
│   ├── src/
│   │   ├── commands/       # Tauri commands (API)
│   │   ├── domain/         # Rust domain
│   │   ├── runner.rs       # Git command execution
│   │   └── lib.rs          # Tauri entry point
│   ├── Cargo.toml
│   └── tauri.conf.json
├── tests/                  # E2E/Integration tests
├── package.json
├── tsconfig.json
├── vite.config.ts
└── biome.json              # Linter/Formatter
```

---

## ⚡ Quick Start

### Prerequisites

| Tool | Version | Notes |
| ---- | ------- | ----- |
| Node.js | 24 (see `.nvmrc`) | `nvm use` — Vitest and the build require a current Node |
| pnpm | 10.16.1 | `corepack enable` or `npm i -g pnpm` |
| Rust | stable | via [rustup](https://rustup.rs) |
| Git | 2.x | Must be on `PATH` — the backend shells out to it |
| Tauri system deps | per OS | See [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/) (WebKitGTK on Linux, etc.) |

```bash
# Install dependencies
pnpm install

# Development (frontend + backend)
pnpm tauri dev

# Frontend only
pnpm dev        # Vite dev server
pnpm build      # TypeScript + Vite build

# Production build
pnpm tauri build
```

## Open From Terminal

With the Reflog binary on your `PATH`, open the Git repository in the current directory with:

```bash
reflog .
```

---

## 📦 Build and Release

### System dependencies (Linux)

```bash
# Ubuntu / Debian / Linux Mint
sudo apt install -y libwebkit2gtk-4.1-dev librsvg2-dev libayatana-appindicator3-dev patchelf rpm
```

`rpm` is only needed for the RPM bundle, `patchelf` only for AppImage.

### Local build

```bash
pnpm tauri build --bundles deb,appimage        # add ,rpm if you installed rpm
```

Artifacts land in `src-tauri/target/release/bundle/` (`.deb`, `.AppImage`, `.rpm`) and the
raw binary in `src-tauri/target/release/reflog`. `targets: "all"` in `tauri.conf.json` also
tries RPM and AppImage, so it fails without the packages above.

The Windows `.msi` cannot be produced on Linux — WiX runs on Windows only. Build it with CI
(`gh run download <run-id>`) or on a Windows machine with `pnpm tauri build`.

### CI

| Workflow | Trigger | What it does |
| -------- | ------- | ------------ |
| `.github/workflows/ci.yml` | push / PR | actionlint, Biome, Vitest, `tsc --noEmit`, `cargo test` (Linux) and `cargo check --all-targets` (Windows) |
| `.github/workflows/release.yml` | tag `v*` | same checks, then AppImage + `.deb` + `.rpm` (ubuntu-22.04) and `-setup.exe` (windows-latest), attached to the GitHub Release |

The `cargo check` on `windows-latest` exists because `cfg(windows)` code never compiles on a Linux
dev machine or on the Linux CI runner: a broken `#[cfg(unix)]` branch would otherwise only surface
in the release build, after the tag was pushed.

During the beta line Windows ships the NSIS installer only (`Reflog_<version>_windows_x64-setup.exe`).
The MSI bundler goes through WiX v3, whose `ProductVersion` is numeric-only, so it rejects
`0.1.0-beta.2` and would abort the whole build. The workflow adds `msi` back automatically once
the version has no prerelease suffix (`promote`), so the first stable release gets both installers.

If a bundler fails, the binaries that did get produced are still uploaded to the run page under
Artifacts (`bundles-ubuntu-22.04` / `bundles-windows-latest`) — the release upload is not the only
copy, so nothing is lost while debugging.

The `ci` workflow validates `.github/workflows/*.yml` with
[actionlint](https://github.com/rhysd/actionlint). A workflow file that GitHub cannot parse fails
instantly with zero jobs and no obvious error in the run page, so this catches that class of typo
(the usual one: double quotes inside an `if:` expression, which GitHub rejects — only single quotes
are valid string delimiters there) before it reaches a release tag.

### Versions (the app is in beta)

Reflog is pre-1.0 and ships as **prereleases**: the version carries a semver prerelease tag
(`0.1.0-beta.1`) and the GitHub Release is flagged as *Pre-release*, so a beta never becomes
the "Latest" release by accident. The same version lives in `package.json`,
`src-tauri/Cargo.toml` and `src-tauri/tauri.conf.json`; CI refuses to build if they drift or
if the tag does not match.

```bash
node scripts/check-version.mjs            # validate + print version and suggested bumps
```

| Current | Next beta | Promote to | Next stable |
| ------- | --------- | ---------- | ----------- |
| `0.1.0-beta.1` | `0.1.0-beta.2` | `0.1.0` | `0.1.1` (patch) / `0.2.0` (minor) |
| `0.1.0` | `0.1.0-beta.1` | — | `0.1.1` / `0.2.0` |

```bash
# 1. set the next version in package.json, src-tauri/Cargo.toml and src-tauri/tauri.conf.json
# 2. validate and commit
node scripts/check-version.mjs

# 3. tag with the exact version (CI fails on any mismatch)
git tag v0.1.0-beta.1 && git push origin master --tags

# download the artifacts of that run
gh run download
```

The release job needs `contents: write`; if it fails with `Resource not accessible by
integration`, enable *Read and write permissions* under Settings → Actions → Workflow
permissions. Releases are unsigned, so Windows SmartScreen warns on first run.

---

## 🧪 Commands

| Command | Description |
| --------- | ------------- |
| `pnpm dev` | Start Vite dev server |
| `pnpm build` | Type-check + build frontend |
| `pnpm tauri dev` | Run Tauri app with hot reload |
| `pnpm tauri build` | Build native binaries |
| `pnpm lint` | Run Biome linter |
| `pnpm lint:fix` | Auto-fix lint issues |
| `pnpm test` | Run Vitest unit tests (requires Node 24) |

---

## 📖 Documentation

- [Frontend Architecture](./doc/frontend.md) - React architecture, components, hooks, state
- [Backend Architecture](./doc/backend.md) - Rust/Tauri architecture, commands, GitRunner
- [API Reference](./doc/api.md) - Complete Tauri command reference with TypeScript types

---

## 🧰 Architecture Highlights

- **Clean Architecture** — Separation of presentation, domain, and infrastructure
- **Trait-based Rust backend** — `GitRunner` trait for testability (mock runner in tests)
- **Type-safe IPC** — Full TypeScript definitions for all Tauri commands
- **Blocking operations handled correctly** — `spawn_blocking` for Git commands
- **Security-first** — No shell (argv arrays), `--` separators, input validators, config allowlist, output caps, timeouts, `--force-with-lease` instead of `--force`
- **Performance** — LTO, stripped binaries, lazy-loaded routes, paginated lists

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

## 🤝 Contributing

PRs welcome! Please run `pnpm lint:fix` and `pnpm test` before submitting.
