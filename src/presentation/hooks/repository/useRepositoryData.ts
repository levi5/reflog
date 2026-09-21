import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { IGitApi } from "../../../infrastructure/git/types"
import { GRAPH_LIMIT, LOG_LIMIT, REFLOG_LIMIT } from "../../../shared/constants/limits"
import type { BranchInfo, CommitInfo, ConflictFile, ReflogEntry, RemoteInfo, StatusResult } from "../../../types"

import { usePaginated } from "./usePaginated"

interface RepositoryDataDeps {
  repo: string
  git: IGitApi
  setBusy: (busy: boolean) => void
  setMsg: (message: string) => void
}

export function useRepositoryData({ repo, git, setBusy, setMsg }: RepositoryDataDeps) {
  const [status, setStatus] = useState<StatusResult | null>(null)
  const [branches, setBranches] = useState<BranchInfo[]>([])
  const [conflicts, setConflicts] = useState<ConflictFile[]>([])
  const [reflog, setReflog] = useState<ReflogEntry[]>([])
  const [reflogLoading, setReflogLoading] = useState(false)
  const [reflogLoaded, setReflogLoaded] = useState(false)
  const [tags, setTags] = useState<string[]>([])
  const [remotes, setRemotes] = useState<RemoteInfo[]>([])
  const [gitVersion, setGitVersion] = useState("")
  const [remoteUrl, setRemoteUrl] = useState("")
  const [gpg, setGpg] = useState("")
  const localBranches = useMemo(() => branches.filter((branch) => !branch.remote), [branches])
  const logPage = usePaginated<CommitInfo>({
    repo,
    step: LOG_LIMIT,
    load: (root, limit) => git.log(root, limit),
    onError: setMsg,
  })
  const graphPage = usePaginated<CommitInfo>({
    repo,
    step: GRAPH_LIMIT,
    load: (root, limit) => git.graph(root, limit),
    onError: setMsg,
  })
  const refreshRequestRef = useRef(0)
  const reflogRequestRef = useRef(0)
  const reflogLoadingRef = useRef(false)
  const staticCacheRef = useRef<{ repo: string; version: string; remoteUrl: string; gpg: string } | null>(null)

  const loadReflog = useCallback(async () => {
    if (!repo || reflogLoadingRef.current) return
    const request = reflogRequestRef.current + 1
    reflogRequestRef.current = request
    reflogLoadingRef.current = true
    setReflogLoading(true)
    try {
      const entries = await git.reflog(repo, REFLOG_LIMIT)
      if (request === reflogRequestRef.current) setReflog(entries)
    } catch (error) {
      if (request === reflogRequestRef.current) setMsg(String(error))
    } finally {
      if (request === reflogRequestRef.current) {
        reflogLoadingRef.current = false
        setReflogLoaded(true)
        setReflogLoading(false)
      }
    }
  }, [repo, git, setMsg])

  const refresh = useCallback(
    async (root: string) => {
      if (!root) return
      const request = refreshRequestRef.current + 1
      refreshRequestRef.current = request
      setBusy(true)
      reflogRequestRef.current += 1
      reflogLoadingRef.current = false
      setReflogLoading(false)
      logPage.reset()
      graphPage.reset()
      try {
        const cached = staticCacheRef.current
        const staticPromise =
          cached?.repo === root
            ? Promise.resolve([cached.version, cached.remoteUrl, cached.gpg] as const)
            : Promise.all([git.version(), git.remoteUrl(root), git.gpg(root)])
        const [status, branches, conflicts, tags, remotes, [version, remoteUrl, gpg]] = await Promise.all([
          git.status(root),
          git.branches(root),
          git.conflicted(root),
          git.tagList(root),
          git.remoteList(root),
          staticPromise,
        ])
        if (request !== refreshRequestRef.current) return
        staticCacheRef.current = { repo: root, version, remoteUrl, gpg }
        setStatus(status)
        setBranches(branches)
        setReflog([])
        setReflogLoaded(false)
        setConflicts(conflicts)
        setGitVersion(version)
        setRemoteUrl(remoteUrl)
        setGpg(gpg)
        setTags(tags)
        setRemotes(remotes)
        if (conflicts.length === 0) setMsg("")
      } catch (error) {
        if (request === refreshRequestRef.current) setMsg(String(error))
      } finally {
        if (request === refreshRequestRef.current) setBusy(false)
      }
    },
    [git, logPage.reset, graphPage.reset, setBusy, setMsg],
  )

  useEffect(() => {
    if (repo) void refresh(repo)
  }, [repo, refresh])

  return {
    status,
    branches,
    localBranches,
    conflicts,
    setConflicts,
    reflog,
    reflogLoading,
    reflogLoaded,
    loadReflog,
    tags,
    remotes,
    gitVersion,
    remoteUrl,
    gpg,
    logPage,
    graphPage,
    refresh,
  }
}
