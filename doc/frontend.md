# Frontend Documentation

## Overview

The frontend is a React 19 + TypeScript application built with Vite, following Clean Architecture principles and separation of concerns.

## Architecture

### Layers

```txt
src/
├── presentation/        # Presentation Layer (UI)
│   ├── components/      # Reusable components (Commit, Diff, Modal, …)
│   ├── pages/           # Pages (routes)
│   ├── layout/          # Application layouts
│   ├── context/         # React Context providers
│   └── hooks/           # Custom hooks
├── domain/              # Domain Layer
│   └── entities/        # Business entities (TypeScript)
├── infrastructure/      # Infrastructure Layer
│   ├── git/             # Typed Tauri command wrappers (IGitApi)
│   ├── storage/         # Versioned localStorage helpers + usePersistentSetting
│   └── templates/       # Template IO helpers
├── data/                # Use-cases, protocols and ready-to-use singletons
├── shared/              # Shared code
│   ├── utils/           # Utilities
│   ├── constants/       # Constants
│   └── schemas/         # Zod schemas
├── message/             # i18n strings (en.json, pt.json)
├── types/               # Shared TypeScript types (mirrors backend entities)
├── i18n.ts              # t(lang, key), formatMessage, locale helpers
└── routes.tsx           # Route configuration
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
    element: <AppLayout />,
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
| `/merge` | Merge | Conflict resolution |
| `/blame` | Blame | Line annotations (git blame) |
| `/visualize` | Visualize | Advanced visualizations |
| `/automation`, `/automation/:section` | AutomationHub | Automations, templates, recipes, monitors |
| `/repo/*` | RepoDeepLink | Deep link: validates path, redirects to view |
| `/docs` | Docs | Integrated documentation |
| `/settings` | Settings | App settings |

`/monitors` and `/templates` redirect to `/automation?section=…`.
Unknown paths render `RouteNotFound`; loader/route errors render
`RouteErrorElement`. Deep-link validation lives in `repoLoader`
(`src/routes.tsx`), which returns 400 for empty paths and 404 for
non-repositories.

## Key Components

### Layout (`src/presentation/layout/`)

- **AppLayout** - Main wrapper with global providers
- **MainLayout** - Layout with sidebar, header, content area
- **Sidebar** - Lateral navigation with repositories
- **Header** - Top bar with global actions

### Reusable Components (`src/presentation/components/`)

#### Git/Repository

- `Status/` - File status rows (staged/unstaged/conflicted)
- `Branch/` - Branch panel (create, checkout, delete, rename)
- `Commit/` - Commit list, detail, message form
- `Diff/` - Diff viewer + preview (syntax highlighted)
- `Merge/` - Conflict resolver, merge tool
- `Tag/`, `Console/`, `Graph/` - Tags, git console, DAG cells
- `Recent/` - Recent repositories

#### Base UI

- `Button/` - Variants (primary, secondary, ghost, danger)
- `Modal/` - Accessible modals (focus trap, Esc, backdrop close)
- `Drawer/` - Side panels
- `Tabs/` - Tabs
- `Select/` - Custom dropdowns
- `Toast/` - Notifications
- `Pagination/`, `Skeleton/`, `Resizable/` - Paging, loading skeletons, split layouts
- `Switch/`, `Filter/`, `Search/`, `Command/` - Toggles, filters, search box, palette

#### Specialized

- `Editor/` - File/conflict editors
- `Monitor/`, `Recipe/`, `Automations/`, `Block/` - Automation hub UI
- `Profile/`, `ErrorBoundary/`, `ErrorFallback/`, `FatalError/` - Profiles + error UI
- `Bar/`, `SideBar/`, `Header/`, `Window/`, `Brand/`, `Icons/`, `Activity/`, `Event/`, `Empty/` - Chrome + misc

## Global State (Context)

### Main Providers (`src/presentation/context/`)

Providers are composed in `AppLayout` / `routes.tsx`
(`RepoProvider` wraps the whole app):

- **RepoProvider** (`repository/`) - Current repo, status, branches, log/graph pages, git actions
- **MessageProvider** (`message/`) - Toasts (`notify/error/success/response/loading`, auto-dismiss timers)
- **TranslationProvider** (`translation/`) - `lang`, `t(key)`, `format*` helpers (pt/en)
- **SettingsProvider** (`settings/`) - User settings (wraps translation)
- **ThemeProvider / AccentProvider** (`theme/`, `accent/`) - Theme + accent color
- **CommitConfigProvider** (`commit/`) - Commit prefs, presets, history
- **ProfileProvider** (`profile/`) - Git identity profiles
- **SearchProvider** (`filter/`) - Global search query/scope
- **UiProvider** (`ui/`), **StartupProvider** (`startup/`) - UI state, startup/reopen logic

Every setting above is persisted by `usePersistentSetting`
(`src/infrastructure/storage/versioned-storage.ts`): it reads the versioned
key, normalizes the value, writes it back debounced, mirrors changes from other
tabs and applies the side effect (CSS variable, `data-*` attribute). Adding a new
setting means one hook call, not a new copy of that plumbing.

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
| `useGitAction` / `useGitActions` | `runAction` adapters with i18n messages |
| `usePaginated` | Paginated IPC loading (log/graph pages) |
| `useCommitTemplate` | Conventional-commit builder (fields <-> formatted message) |
| `useTemplateManager`, `useTemplateDocs` | Template CRUD + docs |
| `useMatchNavigator`, `useResizable`, `useIntersectionObserver`, `useAutoRefresh`, `useDismiss`, `useWindowDrag` | UI utilities |
| `useConsoleSession`, `consoleHistory` | In-app git console |
| `useAutomations`, `useAutomationStore`, `useRecipeEditor`, `useAutomationTransfer`, `conditionRunner` | Automations/recipes/monitors |
| `useProfiles` | Git identity profiles |

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
`StashItem`, …) are mirrored in `src/types/` (see `src/types/main.ts`),
matching the Rust `domain/entities.rs` field for field.

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
(`src/infrastructure/git/types.ts`):

```ts
// src/infrastructure/git/index.ts
import { invoke } from '@tauri-apps/api/core'

export const gitStatus = (repoPath: string) =>
  invoke<StatusResult>('git_status', { repoPath })

export const gitCommit = (repoPath: string, message: string, signoff = false, sign = false) =>
  invoke<string>('git_commit', { repoPath, message, signoff, sign })
```

### Usage Pattern

```tsx
// Hooks consume IGitApi (injected, default: gitApi singleton)
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
| `Ctrl/Cmd+K` | Command palette |
| `Ctrl/Cmd+F` | Focus the page search box |
| `Ctrl/Cmd+P` | Quick open a tracked file |
| `Ctrl/Cmd+Z` / `Ctrl/Cmd+Shift+Z` | Undo / redo the last reversible action |
| `F5`, `Ctrl/Cmd+R` | Refresh the repository |

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

- **Vitest** - Unit tests (`*.test.ts`, run with Node 24 — see `.nvmrc`)

```bash
pnpm test           # Run tests (vitest run)
```

Covered today: automation codecs, partial patches, command-palette fuzzy
matching, shared utils, theme/accent contrast tokens, the modal stack, reduced
motion, and SSR renders of a few components. There is no React Testing Library
or E2E setup, so hooks and context providers are still untested.

## Build and Deploy

### Development

```bash
pnpm dev            # Vite dev server (hot reload)
pnpm tauri dev      # Tauri app with dev server
```

### Production

```bash
pnpm build          # tsc + vite build
pnpm tauri build    # Native bundle (AppImage, .dmg, .msi)
```

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
   register in `useModalStack` so `Escape` only reaches the topmost one
6. **Type safety** - `strict: true`, `noUnusedLocals`, `noUnusedParameters`,
   `noFallthroughCasesInSwitch` (see `tsconfig.json`)
