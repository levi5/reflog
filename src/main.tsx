import React from "react"
import ReactDOM from "react-dom/client"
import { RouterProvider } from "react-router-dom"
import { SettingsProvider } from "./presentation/context"
import { ErrorBoundary } from "./presentation/components/ErrorBoundary"
import { router } from "./routes"
import "./styles/globals.scss"

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <SettingsProvider>
        <RouterProvider router={router} />
      </SettingsProvider>
    </ErrorBoundary>
  </React.StrictMode>,
)
