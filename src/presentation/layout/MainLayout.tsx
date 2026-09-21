import { Suspense } from "react"
import { Outlet, useLocation, useOutletContext } from "react-router-dom"
import { Spinner } from "../components/Animation/Spinner"
import { ErrorBoundary } from "../components/ErrorBoundary"
import type { AppOutletContext } from "./App"

export function MainLayout() {
  const outletContext = useOutletContext<AppOutletContext>()
  const location = useLocation()
  return (
    <ErrorBoundary key={location.pathname}>
      <Suspense fallback={<Spinner />}>
        <Outlet context={outletContext} />
      </Suspense>
    </ErrorBoundary>
  )
}
