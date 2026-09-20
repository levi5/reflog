import { useContext } from "react"
import { ProfileContext } from "../../context"

interface Deps {
  lang?: "pt" | "en"
  repoRoot?: string
  setMsg?: (m: string) => void
}

export function useProfiles(_deps?: Deps) {
  const context = useContext(ProfileContext)
  if (!context) {
    throw new Error("useProfiles must be used within ProfileProvider")
  }
  return context
}

export type ProfilesApi = ReturnType<typeof useProfiles>
