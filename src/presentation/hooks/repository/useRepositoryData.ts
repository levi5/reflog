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
  const { limit: logLimit, setItems: setLog, setHasMore: setLogHasMore } = logPage
  const { limit: graphLimit, setItems: setGraph, setHasMore: setGraphHasMore } = graphPage
  const refreshingRef = useRef(false)
  const staticCacheRef = useRef<{ repo: string; version: string; remoteUrl: string; gpg: string } | null>(null)

  const refresh = useCallback(
    async (root: string) => {
      if (!root || refreshingRef.current) return
      refreshingRef.current = true
      setBusy(true)
      try {
        const cached = staticCacheRef.current
        const staticPromise =
          cached?.repo === root
            ? Promise.resolve([cached.version, cached.remoteUrl, cached.gpg] as const)
            : Promise.all([git.version(), git.remoteUrl(root), git.gpg(root)])
        const [status, branches, log, graph, reflog, conflicts, tags, remotes, [version, remoteUrl, gpg]] =
          await Promise.all([
            git.status(root),
            git.branches(root),
            git.log(root, logLimit),
            git.graph(root, graphLimit),
            git.reflog(root, REFLOG_LIMIT),
            git.conflicted(root),
            git.tagList(root),
            git.remoteList(root),
            staticPromise,
          ])
        staticCacheRef.current = { repo: root, version, remoteUrl, gpg }
        setStatus(status)
        setBranches(branches)
        setLog(log)
        setGraph(graph)
        setReflog(reflog)
        setConflicts(conflicts)
        setGitVersion(version)
        setRemoteUrl(remoteUrl)
        setGpg(gpg)
        setTags(tags)
        setRemotes(remotes)
        setLogHasMore(log.length >= logLimit)
        setGraphHasMore(graph.length >= graphLimit)
        if (conflicts.length === 0) setMsg("")
      } catch (error) {
        setMsg(String(error))
      } finally {
        refreshingRef.current = false
        setBusy(false)
      }
    },
    [git, logLimit, graphLimit, setBusy, setMsg, setLog, setGraph, setLogHasMore, setGraphHasMore],
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
