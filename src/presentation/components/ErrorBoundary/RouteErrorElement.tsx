import { useNavigate, useRouteError } from "react-router-dom"
import { ErrorFallback } from "../ErrorFallback"

export function RouteErrorElement() {
  const error = useRouteError()
  const navigate = useNavigate()

  const handleReset = () => {
    try {
      navigate("/", { replace: true })
    } catch {
      window.location.hash = "#/"
    }
  }

  return <ErrorFallback error={error} reset={handleReset} />
}

export function RouteNotFound() {
  const navigate = useNavigate()

  const handleReset = () => {
    try {
      navigate("/", { replace: true })
    } catch {
      window.location.hash = "#/"
    }
  }

  return <ErrorFallback error={new Error("404 — página não encontrada")} reset={handleReset} />
}
