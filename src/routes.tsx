import { lazy } from "react"
import { createHashRouter, Navigate } from "react-router-dom"

import { AppLayout } from "./presentation/layout/App"
import { MainLayout } from "./presentation/layout/MainLayout"
import { RouteErrorElement, RouteNotFound } from "./presentation/components/ErrorBoundary/RouteErrorElement"
import { MessageProvider, RepoProvider } from "./presentation/context"
import { detectLocale, formatMessage } from "./i18n"

const Welcome = lazy(() =>
  import("./presentation/pages/Welcome").then((pageModule) => ({ default: pageModule.Welcome })),
)
const Merge = lazy(() => import("./presentation/pages/Merge").then((pageModule) => ({ default: pageModule.MergePage })))
const Staging = lazy(() =>
  import("./presentation/pages/Staging").then((pageModule) => ({ default: pageModule.Staging })),
)
const Graph = lazy(() => import("./presentation/pages/Graph").then((pageModule) => ({ default: pageModule.Graph })))
const Blame = lazy(() => import("./presentation/pages/Blame").then((pageModule) => ({ default: pageModule.Blame })))
const Visualize = lazy(() =>
  import("./presentation/pages/Visualize").then((pageModule) => ({
    default: pageModule.Visualize,
  })),
)
const AutomationHub = lazy(() =>
  import("./presentation/pages/Automations/Hub").then((pageModule) => ({
    default: pageModule.AutomationHub,
  })),
)
const Compare = lazy(() =>
  import("./presentation/pages/Compare").then((pageModule) => ({ default: pageModule.CompareRefsPage })),
)
const Docs = lazy(() => import("./presentation/pages/Docs").then((pageModule) => ({ default: pageModule.Docs })))
const Settings = lazy(() =>
  import("./presentation/pages/Settings").then((pageModule) => ({
    default: pageModule.Settings,
  })),
)
const RepoDeepLink = lazy(() =>
  import("./presentation/pages/RepoDeepLink").then((pageModule) => ({ default: pageModule.RepoDeepLink })),
)

export async function repoLoader({ params }: { params: Record<string, string | undefined> }) {
  const splat = params["*"] ?? ""
  const [maybeView, ...rest] = splat.split("/").filter(Boolean)
  const knownViews = new Set([
    "staging",
    "graph",
    "blame",
    "merge",
    "visualize",
    "monitors",
    "templates",
    "automation",
    "compare",
  ])
  const hasView = knownViews.has(maybeView)
  const encodedPath = hasView ? rest.join("/") : [maybeView, ...rest].filter(Boolean).join("/")
  const view = hasView ? maybeView : "staging"
  let repoPath = ""
  try {
    repoPath = decodeURIComponent(encodedPath)
  } catch {
    repoPath = encodedPath
  }
  if (!repoPath) {
    throw new Response(formatMessage(detectLocale(), "routeErrorNoRepoPath"), { status: 400 })
  }
  try {
    const { gitApi } = await import("./infrastructure/git")
    const ok = await gitApi.checkRepo(repoPath)
    if (!ok) {
      throw new Response(formatMessage(detectLocale(), "routeErrorNotAGitRepo", { path: repoPath }), { status: 404 })
    }
    const root = await gitApi.repoRoot(repoPath)
    return { repoPath: root || repoPath, view }
  } catch (e) {
    if (e instanceof Response) throw e
    throw new Response(formatMessage(detectLocale(), "routeErrorCheckFailed", { path: repoPath }), { status: 500 })
  }
}

export const router = createHashRouter([
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
      {
        path: "",
        element: <MainLayout />,
        children: [
          { index: true, element: <Welcome /> },
          { path: "merge", element: <Merge /> },
          { path: "staging", element: <Staging /> },
          { path: "graph", element: <Graph /> },
          { path: "blame", element: <Blame /> },
          { path: "visualize", element: <Visualize /> },
          { path: "automation", element: <AutomationHub /> },
          { path: "automation/:section", element: <AutomationHub /> },
          { path: "monitors", element: <Navigate to="/automation?section=monitors" replace /> },
          { path: "templates", element: <Navigate to="/automation?section=templates" replace /> },
          {
            path: "repo/*",
            loader: repoLoader,
            element: <RepoDeepLink />,
          },
          { path: "compare", element: <Compare /> },
          { path: "docs", element: <Docs /> },
          { path: "settings", element: <Settings /> },
          { path: "*", element: <RouteNotFound /> },
        ],
      },
    ],
  },
])
