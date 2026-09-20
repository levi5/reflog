# Reflog

![Reflog Screenshot](./public/app-screenshot.png)

A modern desktop Git client built with **Tauri 2**, **React 19**, and **Rust** — focused on conflict resolution, history visualization, and workflow automations.

---

## 🏷️ Badges

![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)
![Tauri](https://img.shields.io/badge/Tauri-2-24c8db?style=flat-square&logo=tauri&logoColor=white)
![React](https://img.shields.io/badge/React-19-61dafb?style=flat-square&logo=react&logoColor=white)
![Rust](https://img.shields.io/badge/Rust-2021-f74c00?style=flat-square&logo=rust&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?style=flat-square&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-6-646cff?style=flat-square&logo=vite&logoColor=white)
![Biome](https://img.shields.io/badge/Formatter-Biome-60a5fa?style=flat-square&logo=biome&logoColor=white)

---

## ✨ Features

| Category | Features |
| ---------- | ---------- |
| 📁 **Repository** | Open, clone, initialize, recent repos |
| 📦 **Staging** | Add, unstage, discard, commit, amend |
| 📊 **History** | Log, graph (DAG), blame, diff, reflog |
| ⚔️ **Conflicts** | Visual merge tool, cherry-pick, revert |
| 🔄 **Sync** | Push, pull, fetch, stash, submodules |
| 🌿 **Branches/Tags** | Create, delete, rename, merge, tag |
| ⚙️ **Automations** | Commit templates, hooks, recipes |
| 🛠️ **Settings** | Git config, identity, GPG, remotes |

---

## 🛠 Tech Stack

### Frontend

| Tech | Version | Purpose |
| ------ | --------- | --------- |
| ![React](https://img.shields.io/badge/React-19-61dafb?logo=react&logoColor=white) | 19 | UI library |
| ![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript&logoColor=white) | 5 | Type safety |
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

```
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
| `pnpm test` | Run Vitest unit tests |

---

## 📖 Documentation

- [🏗️ Frontend Architecture](./frontend.md) — React architecture, components, hooks, state
- [⚙️ Backend Architecture](./backend.md) — Rust/Tauri architecture, commands, GitRunner
- [📡 API Reference](./api.md) — Complete Tauri command reference with TypeScript types

---

## 🧰 Architecture Highlights

- **Clean Architecture** — Separation of presentation, domain, and infrastructure
- **Trait-based Rust backend** — `GitRunner` trait for testability (mock runner in tests)
- **Type-safe IPC** — Full TypeScript definitions for all Tauri commands
- **Blocking operations handled correctly** — `spawn_blocking` for Git commands
- **Security-first** — No shell injection, path validation, scoped FS access
- **Performance** — LTO, stripped binaries, lazy-loaded routes, virtualized lists

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

## 🤝 Contributing

PRs welcome! Please run `pnpm lint:fix` and `pnpm test` before submitting.
