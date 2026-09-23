import { lazy } from "react"
import { createHashRouter, Navigate } from "react-router-dom"

import { AppLayout } from "./presentation/layout/App"
import { MainLayout } from "./presentation/layout/MainLayout"
import { RouteErrorElement, RouteNotFound } from "./presentation/components/ErrorBoundary/RouteErrorElement"
import { RepoProvider } from "./presentation/context"

const Welcome = lazy(() => import("./presentation/pages/Welcome").then((m) => ({ default: m.Welcome })))
const Merge = lazy(() => import("./presentation/pages/Merge").then((m) => ({ default: m.MergePage })))
const Staging = lazy(() => import("./presentation/pages/Staging").then((m) => ({ default: m.Staging })))
const Graph = lazy(() => import("./presentation/pages/Graph").then((m) => ({ default: m.Graph })))
const Blame = lazy(() => import("./presentation/pages/Blame").then((m) => ({ default: m.Blame })))
const Visualize = lazy(() =>
  import("./presentation/pages/Visualize").then((m) => ({
    default: m.Visualize,
  })),
)
const AutomationHub = lazy(() =>
  import("./presentation/pages/Automations/Hub").then((m) => ({
    default: m.AutomationHub,
  })),
)
const Docs = lazy(() => import("./presentation/pages/Docs").then((m) => ({ default: m.Docs })))
const Settings = lazy(() =>
  import("./presentation/pages/Settings").then((m) => ({
    default: m.Settings,
  })),
)
const RepoDeepLink = lazy(() => import("./presentation/pages/RepoDeepLink").then((m) => ({ default: m.RepoDeepLink })))

export async function repoLoader({ params }: { params: Record<string, string | undefined> }) {
  const splat = params["*"] ?? ""
  const [maybeView, ...rest] = splat.split("/").filter(Boolean)
  const knownViews = new Set(["staging", "graph", "blame", "merge", "visualize", "monitors", "templates", "automation"])
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
    throw new Response("Repositório não informado na URL", { status: 400 })
  }
  try {
    const { gitApi } = await import("./infrastructure/git")
    const ok = await gitApi.checkRepo(repoPath)
    if (!ok) {
      throw new Response(`Não é um repositório git: ${repoPath}`, { status: 404 })
    }
    const root = await gitApi.repoRoot(repoPath)
    return { repoPath: root || repoPath, view }
  } catch (e) {
    if (e instanceof Response) throw e
    throw new Response(`Falha ao verificar repositório: ${repoPath}`, { status: 500 })
  }
}

export const router = createHashRouter([
  {
    path: "/",
    element: (
      <RepoProvider>
        <AppLayout />
      </RepoProvider>
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
          { path: "docs", element: <Docs /> },
          { path: "settings", element: <Settings /> },
          { path: "*", element: <RouteNotFound /> },
        ],
      },
    ],
  },
])
