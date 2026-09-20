import { Outlet } from "react-router-dom"
import { Windows } from "../components/Window"

export function AuthLayout() {
  return (
    <Windows.Frame>
      <Outlet />
    </Windows.Frame>
  )
}
