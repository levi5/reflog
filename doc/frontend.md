# Frontend Documentation

## Overview

The frontend is a React 19 + TypeScript application built with Vite, following Clean Architecture principles and separation of concerns.

## Architecture

### Layers

```txt
src/
├── presentation/        # Presentation Layer (UI)
│   ├── components/      # Reusable components
│   ├── pages/           # Pages (routes)
│   ├── layout/          # Application layouts
│   ├── context/         # React Context providers
│   └── hooks/           # Custom hooks
├── domain/              # Domain Layer
│   └── entities/        # Business entities (TypeScript)
├── infrastructure/      # Infrastructure Layer
│   └── tauri/           # Tauri command wrappers
├── shared/              # Shared code
│   ├── utils/           # Utilities
│   ├── constants/       # Constants
│   └── types/           # Shared types
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
| `/graph` | Graph | History visualization (DAG) |
| `/merge` | Merge | Conflict resolution |
| `/blame` | Blame | Line annotations (git blame) |
| `/visualize` | Visualize | Advanced visualizations |
| `/automation` | AutomationHub | Automations, templates, recipes |
| `/docs` | Docs | Integrated documentation |
| `/settings` | Settings | App settings |

## Key Components

### Layout (`src/presentation/layout/`)

- **AppLayout** - Main wrapper with global providers
- **MainLayout** - Layout with sidebar, header, content area
- **Sidebar** - Lateral navigation with repositories
- **Header** - Top bar with global actions

### Reusable Components (`src/presentation/components/`)

#### Git/Repository

- `Repository/` - Selector, list, repository actions
- `Branch/` - Branch picker, create, delete, rename
- `Commit/` - Commit list, details, message editor
- `Diff/` - Diff viewer (unified, side-by-side)
- `Merge/` - Conflict resolver, merge tool
- `Staging/` - Stage/unstage, file status

#### Base UI

- `Button/` - Variants (primary, secondary, ghost, danger)
- `Dialog/` - Accessible modals
- `Drawer/` - Side panels
- `Tabs/` - Tabs
- `Select/` - Custom dropdowns
- `Toast/` - Notifications
- `Modal/` - Complex modals

#### Specialized

- `Editor/` - Code editor (conflicts, commit msg)
- `Graph/` - Commit DAG rendering
- `Diff/` - Syntax highlighted diff
- `Command/` - Command palette (Cmd+K)
- `Search/` - Global search

## Global State (Context)

### Main Providers (`src/presentation/context/`)

```tsx
// Example structure
<RepositoryProvider>
  <ConfigProvider>
    <UIProvider>
      <NotificationProvider>
        <App />
      </NotificationProvider>
    </UIProvider>
  </ConfigProvider>
</RepositoryProvider>
```

- **RepositoryContext** - Current repo, repo list, actions
- **ConfigContext** - User settings, preferences
- **UIContext** - UI state (sidebar open, theme, loading)
- **NotificationContext** - Toasts, global alerts

## Custom Hooks (`src/presentation/hooks/`)

| Hook | Responsibility |
| ------ | ---------------- |
| `useRepository` | Current repo access, actions |
| `useGitStatus` | File status (staged/unstaged) |
| `useGitLog` | Paginated commit history |
| `useGitDiff` | File/commit diff |
| `useGitBranches` | Branch list and actions |
| `useMerge` | Merge/conflict state |
| `useStaging` | Staging operations |
| `useKeybindings` | Global shortcuts |

## Domain Entities (`src/domain/entities/`)

TypeScript interfaces representing business models:

```txt
entities/
├── automations/   # Templates, recipes, hooks
├── blame/         # Blame annotations
├── code/          # Code blocks, snippets
├── commit/        # Commit, signature, parents
├── conflict/      # Conflict markers, hunks
├── diff/          # Diff, hunks, lines
├── git/           # Repo, remote, config
├── graph/         # Graph nodes, edges
├── merge/         # Merge state, strategies
├── profile/       # User profile, identity
├── semver/        # Version parsing
└── stash/         # Stash entries
```

Example (`commit/index.ts`):

```ts
export interface Commit {
  hash: string
  shortHash: string
  message: string
  author: Signature
  committer: Signature
  parents: string[]
  date: Date
  refs: string[]
}

export interface Signature {
  name: string
  email: string
  date: Date
}
```

## Backend Integration (Tauri)

### Tauri API (`src/infrastructure/tauri/`)

Typed wrappers for backend commands:

```ts
// src/infrastructure/tauri/git.ts
import { invoke } from '@tauri-apps/api/core'

export const gitStatus = (repo: string) =>
  invoke<GitStatus>('git_status', { repo })

export const gitCommit = (repo: string, message: string, amend?: boolean) =>
  invoke<void>('git_commit', { repo, message, amend })
```

### Usage Pattern

```tsx
// In hooks or components
const handleCommit = async (message: string) => {
  await gitCommit(repo, message)
  // Invalidate queries or refresh state as needed
}
```

## Styling

- **Sass/SCSS** - Variables, mixins, nesting
- **CSS Modules** - Local scope (`.module.scss`)
- **Design Tokens** - Colors, spacing, typography in `src/styles/`
- **Theme** - Light/dark mode support via CSS custom properties

## Internationalization (`src/i18n.ts`)

Simple i18n system with TypeScript:

```ts
// src/i18n.ts
export const t = (key: string, params?: Record<string, string>) =>
  translations[locale]?.[key]?.replace(...)
```

## Testing

- **Vitest** - Unit/integration tests
- **React Testing Library** - Component testing

```bash
pnpm test           # Run tests
```

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
3. **Virtualize lists** - For large lists (commits, files)
4. **Error boundaries** - Per feature/page
5. **Accessibility** - ARIA, keyboard nav, focus management
6. **Type safety** - `strict: true`, `noUncheckedIndexedAccess`
