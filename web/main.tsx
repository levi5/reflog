import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import "./global/reset.css"
import "./global/global.css"

import { Landing } from "./pages/Landing"

document.documentElement.classList.add("js")

const container = document.getElementById("root")

if (!container) throw new Error("Root container not found")

createRoot(container).render(
  <StrictMode>
    <Landing />
  </StrictMode>,
)
