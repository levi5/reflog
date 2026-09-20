import { createContext, type ReactNode, useContext } from "react"
import { useRepository } from "../../hooks"
import { useTranslation } from "../translation/translation-context"
import { ProfileProvider } from "../profile/profile-context"
import { CommitConfigProvider } from "../commit/commit-config-context"

export interface RepoContextValue {
  repo: ReturnType<typeof useRepository>
}

const RepoContext = createContext<RepoContextValue | null>(null)

export function RepoProvider({ children }: { children: ReactNode }) {
  const { lang } = useTranslation()
  const repo = useRepository(lang)
  return (
    <RepoContext.Provider value={{ repo }}>
      <ProfileProvider repoRoot={repo.repo} setMsg={repo.setMsg}>
        <CommitConfigProvider>{children}</CommitConfigProvider>
      </ProfileProvider>
    </RepoContext.Provider>
  )
}

export function useRepo() {
  const ctx = useContext(RepoContext)
  if (!ctx) {
    throw new Error("useRepo must be used within RepoProvider")
  }
  return ctx.repo
}
