# Frontend Documentation

## Overview

The frontend is a React 19 + TypeScript application built with Vite, following Clean Architecture principles and separation of concerns.

## Architecture

### Layers

```txt
src/
├── presentation/        # Presentation Layer (UI)
│   ├── cms/             # Content (integrated docs, AutomationHub copy)
│   ├── components/      # Reusable components (Commit, Diff, Modal, …)
│   ├── pages/           # Pages (routes)
│   ├── layout/          # Application layouts (AppLayout, MainLayout)
│   ├── context/         # React Context providers
│   └── hooks/           # Custom hooks
├── domain/              # Domain Layer
│   └── entities/        # Business entities (TypeScript)
├── infrastructure/      # Infrastructure Layer
│   ├── git/             # Typed Tauri command wrappers (IGitApi)
│   ├── storage/         # Versioned localStorage helpers + usePersistentSetting
│   └── templates/       # Builtin template constants (IO goes through git_template_*)
├── data/                # Use-cases, protocols and ready-to-use singletons
│   ├── use-cases/       # Business logic per feature
│   └── protocols/       # Storage ports (e.g. storage.ts)
├── shared/              # Shared code
│   ├── utils/           # Utilities
│   ├── constants/       # Constants
│   └── schemas/         # Zod schemas
├── message/             # i18n strings (en.json, pt.json)
├── styles/              # Design tokens + global styles
├── types/               # Shared TypeScript types (mirrors backend entities)
├── i18n.ts              # t(lang, key), formatMessage, locale helpers
├── routes.tsx           # Route configuration
└── main.tsx             # Entry point
```

### Principles

1. **Separation of concerns** - UI, business logic, and infrastructure isolated
2. **Dependency injection** - Context providers for services
3. **Strong typing** - TypeScript strict mode, Zod for validation
4. **Compound components** - Compound components pattern
5. **Lazy loading** - Code splitting by route

## Routes and Navigation

### Configuration (`src/routes.tsx`)

Uses `react-router-dom` v7 with HashRouter for Tauri compatibility.

```tsx
const router = createHashRouter([
  {
    path: "/",
    element: (
      <MessageProvider>
        <RepoProvider>
          <AppLayout />
        </RepoProvider>
      </MessageProvider>
    ),
    errorElement: <RouteErrorElement />,
    children: [
      { path: "", element: <MainLayout />, children: [...] }
    ]
  }
])
```

### Main Pages

| Route | Page | Description |
| ------- | ------ | ------------- |
| `/` | Welcome | Initial dashboard, recent repositories |
| `/staging` | Staging | Staging area, commit, diff |
| `/graph` | Graph | History visualization (log/graph/reflog) |
| `/compare` | Compare | Two-ref comparison (merge base, stats, ahead/behind, diff) |
| `/merge` | Merge | Conflict resolution |
| `/blame` | Blame | Line annotations (git blame) |
| `/visualize` | Visualize | Advanced visualizations |
| `/automation`, `/automation/:section` | AutomationHub | Automations, templates, recipes, monitors |
| `/repo/*` | RepoDeepLink | Deep link: validates path, redirects to view |
| `/docs` | Docs | Integrated documentation (content from `presentation/cms`) |
| `/settings` | Settings | App settings |

`/monitors` and `/templates` redirect to `/automation?section=…`.
Unknown paths render `RouteNotFound`; loader/route errors render
`RouteErrorElement`. Deep-link validation lives in `repoLoader`
(`src/routes.tsx`), which returns 400 for empty paths, 404 for
non-repositories and 500 for any other failure.

## Key Components

### Layout (`src/presentation/layout/`)

- **AppLayout** (`layout/App/`) - Global providers plus the app chrome: top bar,
  window frame, merge banner and the view tabs
- **MainLayout** (`layout/MainLayout.tsx`) - Error boundary + `Suspense` + `Outlet`

The sidebar and header components themselves live under
`src/presentation/components/SideBar/` and `.../Header/`.

### Reusable Components (`src/presentation/components/`)

#### Git/Repository

- `Status/` - File status rows (staged/unstaged/conflicted)
- `Branch/` - Branch panel (create, checkout, delete, rename)
- `Commit/` - Commit list, detail, message form and the shared detail modal (`Commit.DetailModal`)
- `Diff/` - Diff viewer + preview (syntax highlighted)
- `Merge/` - Conflict resolver, merge tool
- `Tag/`, `Console/`, `Graph/` - Tags, git console, DAG cells
- `Recent/` - Recent repositories

#### Base UI

- `Button/` - Variants (primary, secondary, ghost, danger) plus the compact
  `Button.Action` (icon + label) and square `Button.IconAction` primitives
- `Modal/` - Accessible modals (focus trap, Esc, backdrop close)
- `Dialog/` - Confirm/prompt dialogs built on the modal stack
- `Drawer/` - Side panels
- `Tabs/` - Tabs
- `Select/` - Custom dropdowns
- `Toast/` - Notifications
- `Pagination/`, `Skeleton/`, `Resizable/`, `Accordion/`, `Form/` - Paging, loading skeletons, split layouts, disclosure, inline forms
- `Switch/`, `Search/`, `Command/` - Toggles, search box, palette
- `List/` - List primitives, including `List.Paged`
- `Code/`, `Picker/`, `Wrapper/`, `Animation/` - Highlighting, pickers, layout helpers, spinners

#### Specialized

- `Editor/` - File/conflict editors
- `Monitor/`, `Recipe/`, `Automations/`, `Template/` - Automation hub UI
- `Profile/`, `Repo/`, `ErrorBoundary/`, `ErrorFallback/`, `FatalError/` - Profiles, repo switcher, error UI
- `Bar/`, `SideBar/`, `Header/`, `Window/`, `Brand/`, `Icons/`, `Event/`, `Empty/`, `Tool/` - Chrome + misc

## Global State (Context)

### Main Providers (`src/presentation/context/`)

The chain is nested, not flat. `main.tsx` mounts `SettingsProvider` **outside**
the router, and that one component renders six providers in order:

```txt
main.tsx
└── ErrorBoundary
    └── SettingsProvider          (context/settings/)
        ├── TranslationProvider    (translation/)
        ├── ThemeProvider          (theme/)
        ├── MaterialProvider       (material/)
        ├── AccentProvider         (accent/)
        ├── UiProvider             (ui/)
        └── StartupProvider        (startup/)
            └── RouterProvider (src/routes.tsx)
                └── MessageProvider (message/)
                    └── RepoProvider (repository/)
                        ├── ProfileProvider (profile/)
                        ├── CommitConfigProvider (commit/)
                        └── AppLayout
                            └── SearchProvider (filter/)
```

| Provider | Holds |
| -------- | ----- |
| `TranslationProvider` | `lang`, `t(key)`, `format*` helpers (pt/en) |
| `ThemeProvider` | Light/dark mode |
| `MaterialProvider` | Windows material/acrylic effect |
| `AccentProvider` | Accent color |
| `UiProvider` | UI state (font size, …) |
| `StartupProvider` | Startup/reopen behaviour |
| `MessageProvider` | Toasts (`notify/error/success/response/loading`, auto-dismiss timers) |
| `RepoProvider` | Memoizes the four repository slices — it holds no git logic itself |
| `ProfileProvider` | Git identity profiles |
| `CommitConfigProvider` | Commit prefs, presets, history |
| `SearchProvider` | Global search query/scope (in-memory only) |

### Persistence

Theme, material, accent, UI, startup and translation settings go through
`usePersistentSetting` (`src/infrastructure/storage/versioned-storage.ts`): it
reads the versioned key, normalizes the value, writes it back debounced,
mirrors changes from other tabs and applies the side effect (CSS variable,
`data-*` attribute). Adding a new setting means one hook call, not a new copy
of that plumbing. The first write lands immediately; later ones are debounced.

`CommitConfigProvider` and `ProfileProvider` persist through their own
use-cases (`commitTemplateUseCase`, `profileManagerUseCase`) backed by
`LocalStorageAdapter`, and `SearchProvider` is not persisted at all.

## Use-cases (`src/data/`)

`src/data/index.ts` exposes one ready-to-use instance per use-case
(`commitTemplateUseCase`, `diffParserUseCase`, `mergeStatsUseCase`, …). The
presentation layer consumes those singletons directly; there is no adapter or
factory layer in between.

## Custom Hooks (`src/presentation/hooks/`)

| Hook | Responsibility |
| ------ | ---------------- |
| `useRepository` / `useRepoCore` | Composed repo state + all git operations (`runAction` wrapper with loading/success/error toasts) |
| `useRepositoryData` | Loads status/branches/tags/remotes/log/graph pages |
| `useStaging` | Staging area operations |
| `useMerge` | Merge/conflict state |
| `useBranchOps`, `useTagOps`, `useRemoteOps`, `useStashOps` | Branch/tag/remote/stash actions |
| `useSyncOps` | Pull/push/fetch/upstream actions (internal to `useRepoCore`) |
| `useGitAction` / `useGitActions` | `runAction` adapters with i18n messages |
| `usePaginated` | Paginated IPC loading (log/graph pages) |
| `useCommitTemplate` | Conventional-commit builder (fields <-> formatted message) |
| `useTemplateManager`, `useTemplateDocs` | Template CRUD + docs |
| `useMatchNavigator`, `useResizable`, `useIntersectionObserver`, `useAutoRefresh`, `useDismiss`, `useWindowDrag` | UI utilities |
| `useGlobalShortcuts`, `useAltShortcut` | Keyboard shortcuts |
| `useVirtualRows`, `useUndoStack`, `useFocusTrap`, `useCollapsedSections`, `useElapsed` | Windowing, undo, focus management, disclosure, timers |
| `useConsoleSession` + `consoleHistory` module | In-app git console |
| `useAutomations`, `useAutomationStore`, `useAutomationLog`, `useRecipeEditor`, `useAutomationTransfer` + `conditionRunner` module | Automations/recipes/monitors |
| `useProfiles` | Git identity profiles |

`src/presentation/hooks/index.ts` is the public barrel. A few modules are
deliberately left out of it and imported directly: `ui/useModalStack`
(`pushModal`/`isTopModal`), `ui/useFocusTrap`, `repository/useSyncOps`,
`repository/useHistorySearch`, `repository/useRepositoryData`,
`repository/useRecents`, `repository/useRepoScope`,
`staging/useStagingDiff`, `staging/useStagingBlame`,
`staging/useStagingIndexOps`, `useStableSlice` and the
`conditionRunner` / `consoleHistory` helpers.

Note: `useRepoCore` is two different functions — the builder in
`hooks/repository/useRepoCore.ts` (takes `lang` + an optional `IGitApi`) and
the context reader in `context/repository/repo-context.tsx`.

## Domain Entities (`src/domain/entities/`)

TypeScript interfaces representing business models:

```txt
entities/
├── automations/   # Recipes, monitors, TOML codec
├── blame/         # Blame annotations
├── code/          # Syntax highlighting (lowlight)
├── commit/        # Commit templates, Conventional Commits, markdown
├── conflict/      # Conflict markers, hunks
├── diff/          # Diff parsing
├── git/           # Console parsing
├── graph/         # Graph layout (lanes, DAG)
├── merge/         # Merge stats
├── profile/       # User profiles, identity
└── semver/        # Version parsing
```

Backend-shaped types (`CommitInfo`, `StatusResult`, `BranchInfo`,
`StashItem`, `CompareFileStat`, …) are mirrored in `src/types/`
(see `src/types/main.ts`) against the Rust `domain/entities.rs`: same field
names, same order. Two deliberate differences — the Rust structs are always
serialized, so `upstream`/`mid_line` arrive as `null` rather than missing, and
`#[serde(default)]` fields (`StatusResult.head`, `StatusResult.rebasing`) are
non-optional on the TS side because the backend always sends them.
`LogFilter` and `RebaseOp` are command payloads rather than entities:
`LogFilter` lives next to the client in `ipc-client.ts`, `RebaseOp` in
`src/types/main.ts`.

Example (`src/types/main.ts`):

```ts
export interface CommitInfo {
  hash: string
  short: string
  author: string
  date: string
  message: string
  parents: string[]
  refs: string[]
}
```

## Backend Integration (Tauri)

### Tauri API (`src/infrastructure/git/`)

Typed wrappers for backend commands, described by `IGitApi`
(`src/infrastructure/git/types.ts`) and implemented by the `gitApi` singleton
(`src/infrastructure/git/ipc-client.ts`, re-exported by `index.ts`):

```ts
// src/infrastructure/git/ipc-client.ts
import { invoke } from '@tauri-apps/api/core'

export const gitApi = {
  status: (repoPath: string) => invokeTyped<StatusResult>('git_status', { repoPath }),
  commit: (repoPath: string, message: string, signoff = false, sign = false) =>
    invokeTyped<string>('git_commit', { repoPath, message, signoff, sign }),
  // ...
}
```

`invokeTyped` wraps `invoke` and rethrows failures as `GitApiError`, which
carries the originating `command` name.

### Usage Pattern

```tsx
// Hooks receive IGitApi (default: the gitApi singleton) and call it through runAction
const handleCommit = async (message: string) => {
  await runAction(() => git.commit(repo, message))
  // runAction shows loading/success/error toasts and refreshes repo data
}
```

## Repository State

`useRepository` returns four memoized slices, each behind its own React context:

| Hook | Holds |
| ---- | ----- |
| `useRepoCore()` | status, refs, log/graph, sync, cherry-pick/revert/reset/rebase, undo stack |
| `useStagingSlice()` | diff, blame, editor, stage/unstage/discard, stash, submodules |
| `useCommitSlice()` | commit message and `doCommit` |
| `useMergeSlice()` | conflict resolution state |

`useRepo()` still returns the flattened object, but subscribing to it re-renders
on every change anywhere — prefer the narrow slice whenever a component only
needs one area. Splitting `commitMsg` out is what keeps typing in the commit box
from re-rendering the file list.

## Keyboard Shortcuts

| Shortcut | Action |
| -------- | ------ |
| `Ctrl/Cmd+K` | Command palette (handled by the palette itself) |
| `Ctrl/Cmd+F` | Focus the page search box |
| `Ctrl/Cmd+P` | Quick open a tracked file |
| `Ctrl/Cmd+Z` / `Ctrl/Cmd+Shift+Z` / `Ctrl/Cmd+Y` | Undo / redo the last reversible action |
| `Alt+P` | Cycle Git identity profile |
| `F5`, `Ctrl/Cmd+R` | Refresh the repository |
| `Esc` | Close the topmost overlay (via the modal stack) |

## Styling

- **Sass/SCSS** - Variables, mixins, nesting
- **CSS Modules** - Local scope (`.module.scss`)
- **Design Tokens** - Colors, spacing, typography in `src/styles/`
- **Theme** - Light/dark mode support via CSS custom properties

## Internationalization (`src/i18n.ts` + `src/message/`)

Typed i18n system (pt/en) with string tables in `src/message/*.json`:

```ts
// src/i18n.ts
import pt from './message/pt.json'
export type StringKey = keyof typeof pt
export function t(lang: Lang, key: StringKey): string
export function formatMessage(lang, key, vars?): string // {name} / %s placeholders

// Inside components (lang from context):
const { t } = useTranslation() // t(key: StringKey): string
```

## Testing

- **Vitest** - Unit, component and hook tests (`*.test.ts` / `*.test.tsx`,
  run with Node 24 — see `.nvmrc`)
- **React Testing Library + user-event** - `render`, `renderHook`, `screen`
- **jsdom** - opt-in per file via `// @vitest-environment jsdom`; the default
  environment is `node` (`vite.config.ts`), and the component suites that only
  need markup render with `renderToString`

```bash
pnpm test           # Run tests (vitest run)
```

Layout: `tests/` mirrors `src/` (`tests/data/use-cases/…`,
`tests/presentation/components/…`, `tests/presentation/hooks/…`) plus
`tests/scripts/` for the version helpers and the workflow files.
`tests/presentation/helpers/` holds the shared `render` wrapper and the token
fixtures.

Covered today: automation codecs and TOML import, partial patches, conflict
resolution, semver, graph layout, commit-template round-trip, command-palette
fuzzy matching, shared utils, theme/accent/contrast tokens, the modal stack,
reduced motion, staging and discard semantics, repository action wiring
(through an injected `IGitApi`), context providers, and a set of component
renders, the silent-refresh cheap-path, and hidden-tab polling pauses.
E2E exists as a Playwright smoke suite for the static landing site
(`e2e/`, `pnpm test:e2e`) — the only surface that runs without the Tauri
runtime. App-level flows (staging, merge, rebase) stay on Vitest +
`MockRunner`, so full IPC flows against a real repository are still
untested pending a Tauri-aware harness.

## Build and Deploy

### Development

```bash
pnpm dev            # Vite dev server (hot reload)
pnpm tauri dev      # Tauri app with dev server
pnpm lint           # Biome over src, tests, scripts, web, e2e
```

### Production

```bash
pnpm build          # tsc + vite build
pnpm tauri build    # Native bundle
```

`tauri.conf.json` sets `targets: "all"`, so a local build produces whatever the
host can build (AppImage, `.deb` and `.rpm` on Linux, `.dmg` on macOS,
NSIS and MSI on Windows). The release workflow is narrower — see the README:
it builds `.deb`/`.rpm`/AppImage on `ubuntu-22.04` and NSIS on
`windows-latest`, adding MSI only for non-prerelease versions. There is no
macOS runner, so no macOS artifact is ever published.

### Outputs

- `dist/` - Frontend build
- `src-tauri/target/release/bundle/` - Native binaries

## Best Practices

1. **Lazy load routes** - `React.lazy` + `Suspense`
2. **Memoize computations** - `useMemo`, `useCallback`
3. **Window or paginate large lists** - `List.Paged` slices per page (recipes,
   monitors, templates, profiles); `useVirtualRows` does real windowing for the
   blame view and the commit graph
4. **Error boundaries** - Per feature/page (`RouteErrorElement`, `ErrorFallback`)
5. **Accessibility** - ARIA roles, keyboard nav, focus trap in modals. Overlays
   register in `hooks/ui/useModalStack.ts` (`pushModal`/`isTopModal`) so
   `Escape` only reaches the topmost one
6. **Type safety** - `strict: true`, `noUnusedLocals`, `noUnusedParameters`,
   `noFallthroughCasesInSwitch` (see `tsconfig.json`)
