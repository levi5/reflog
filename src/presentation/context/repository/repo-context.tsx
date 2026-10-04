import { createContext, type ReactNode, useContext, useMemo } from "react"
import { useRepository } from "../../hooks"
import type { Repository, RepositoryCommit, RepositoryCore, RepositoryMerge, RepositoryStaging } from "../../hooks"
import { useTranslation } from "../translation/translation-context"
import { ProfileProvider } from "../profile/profile-context"
import { CommitConfigProvider } from "../commit/commit-config-context"

const RepoCoreContext = createContext<RepositoryCore | null>(null)
const RepoStagingContext = createContext<RepositoryStaging | null>(null)
const RepoCommitContext = createContext<RepositoryCommit | null>(null)
const RepoMergeContext = createContext<RepositoryMerge | null>(null)
const RepoFlatContext = createContext<Repository | null>(null)

export function RepoProvider({ children }: { children: ReactNode }) {
  const { lang } = useTranslation()
  const { core, staging, commit, merge, flat } = useRepository(lang)
  const coreValue = useMemo(() => core, [core])
  const stagingValue = useMemo(() => staging, [staging])
  const commitValue = useMemo(() => commit, [commit])
  const mergeValue = useMemo(() => merge, [merge])
  const flatValue = useMemo(() => flat, [flat])

  return (
    <RepoCoreContext.Provider value={coreValue}>
      <RepoStagingContext.Provider value={stagingValue}>
        <RepoCommitContext.Provider value={commitValue}>
          <RepoMergeContext.Provider value={mergeValue}>
            <RepoFlatContext.Provider value={flatValue}>
              <ProfileProvider repoRoot={core.repo} setMsg={core.setMsg}>
                <CommitConfigProvider>{children}</CommitConfigProvider>
              </ProfileProvider>
            </RepoFlatContext.Provider>
          </RepoMergeContext.Provider>
        </RepoCommitContext.Provider>
      </RepoStagingContext.Provider>
    </RepoCoreContext.Provider>
  )
}

export function useRepoCore(): RepositoryCore {
  const ctx = useContext(RepoCoreContext)
  if (!ctx) {
    throw new Error("useRepoCore must be used within RepoProvider")
  }
  return ctx
}

export function useStagingSlice(): RepositoryStaging {
  const ctx = useContext(RepoStagingContext)
  if (!ctx) {
    throw new Error("useStagingSlice must be used within RepoProvider")
  }
  return ctx
}

export function useCommitSlice(): RepositoryCommit {
  const ctx = useContext(RepoCommitContext)
  if (!ctx) {
    throw new Error("useCommitSlice must be used within RepoProvider")
  }
  return ctx
}

export function useMergeSlice(): RepositoryMerge {
  const ctx = useContext(RepoMergeContext)
  if (!ctx) {
    throw new Error("useMergeSlice must be used within RepoProvider")
  }
  return ctx
}

export function useRepo(): Repository {
  const ctx = useContext(RepoFlatContext)
  if (!ctx) {
    throw new Error("useRepo must be used within RepoProvider")
  }
  return ctx
}
