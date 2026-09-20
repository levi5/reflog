import { lazy } from "react"
import { createHashRouter } from "react-router-dom"

import { AppLayout } from "./presentation/layout/App"
import { MainLayout } from "./presentation/layout/MainLayout"

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

export const router = createHashRouter([
  {
    path: "/",
    element: <AppLayout />,
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
          { path: "docs", element: <Docs /> },
          { path: "settings", element: <Settings /> },
        ],
      },
    ],
  },
])
