import { Suspense } from "react"
import { Outlet, useOutletContext } from "react-router-dom"
import { Spinner } from "../components/Animation/Spinner"
import type { AppOutletContext } from "./App"

export function MainLayout() {
  const outletContext = useOutletContext<AppOutletContext>()
  return (
    <Suspense fallback={<Spinner />}>
      <Outlet context={outletContext} />
    </Suspense>
  )
}
