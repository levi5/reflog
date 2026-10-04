import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { IGitApi } from "../../../infrastructure/git/types"
import { GRAPH_LIMIT, LOG_LIMIT, REFLOG_LIMIT } from "../../../shared/constants/limits"
import type {
  BranchInfo,
  CommitInfo,
  ConflictFile,
  ReflogEntry,
  RemoteInfo,
  StatusResult,
  SubmoduleInfo,
} from "../../../types"

import { usePaginated } from "./usePaginated"
import { sameBranches, sameConflicts, sameRemotes, sameStatus, sameStrings, sameSubmodules } from "./snapshot"

interface RepositoryDataDeps {
  repo: string
  git: IGitApi
  setBusy: (busy: boolean) => void
  setMsg: (message: string) => void
}

export type RefreshMode = "full" | "data" | "silent"

export function useRepositoryData({ repo, git, setBusy, setMsg }: RepositoryDataDeps) {
  const [status, setStatus] = useState<StatusResult | null>(null)
  const [branches, setBranches] = useState<BranchInfo[]>([])
  const [conflicts, setConflicts] = useState<ConflictFile[]>([])
  const [reflog, setReflog] = useState<ReflogEntry[]>([])
  const [reflogLoading, setReflogLoading] = useState(false)
  const [reflogLoaded, setReflogLoaded] = useState(false)
  const [tags, setTags] = useState<string[]>([])
  const [remotes, setRemotes] = useState<RemoteInfo[]>([])
  const [submodules, setSubmodules] = useState<SubmoduleInfo[]>([])
  const [gitVersion, setGitVersion] = useState("")
  const [remoteUrl, setRemoteUrl] = useState("")
  const [gpg, setGpg] = useState("")
  const [totalCommits, setTotalCommits] = useState<number | null>(null)
  const localBranches = useMemo(() => branches.filter((branch) => !branch.remote), [branches])
  const loadLog = useCallback((root: string, limit: number, skip: number) => git.log(root, limit, skip), [git])
  const loadGraph = useCallback((root: string, limit: number, skip: number) => git.graph(root, limit, skip), [git])
  const getCommitId = useCallback((commit: CommitInfo) => commit.hash, [])
  const logPage = usePaginated<CommitInfo>({
    repo,
    step: LOG_LIMIT,
    load: loadLog,
    onError: setMsg,
    getId: getCommitId,
  })
  const graphPage = usePaginated<CommitInfo>({
    repo,
    step: GRAPH_LIMIT,
    load: loadGraph,
    onError: setMsg,
    getId: getCommitId,
  })
  const refreshRequestRef = useRef(0)
  const reflogRequestRef = useRef(0)
  const reflogLoadingRef = useRef(false)
  const countPendingRef = useRef(false)
  const countRepoRef = useRef<string | null>(null)
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
    async (root: string, mode: RefreshMode = "data") => {
      if (!root) return
      const full = mode === "full"
      const silent = mode === "silent"
      const request = refreshRequestRef.current + 1
      refreshRequestRef.current = request
      if (!silent) setBusy(true)
      if (full) {
        reflogRequestRef.current += 1
        reflogLoadingRef.current = false
        setReflogLoading(false)
        logPage.reset()
        graphPage.reset()
      }
      if (full && countRepoRef.current !== root) {
        countRepoRef.current = null
        setTotalCommits(null)
      }
      const needsCount = !countPendingRef.current && (full || countRepoRef.current === null)
      if (needsCount) countPendingRef.current = true
      try {
        const cached = staticCacheRef.current
        const staticPromise =
          cached?.repo === root
            ? Promise.resolve([cached.version, cached.remoteUrl, cached.gpg] as const)
            : Promise.all([
                git.version().catch(() => ""),
                git.remoteUrl(root).catch(() => ""),
                git.gpg(root).catch(() => ""),
              ])
        const [nextStatus, nextBranches, nextConflicts, nextTags, nextRemotes, nextModules, nextTotal, statics] =
          await Promise.all([
            git.status(root),
            git.branches(root),
            git.conflicted(root),
            git.tagList(root),
            git.remoteList(root),
            git.submodules(root).catch(() => [] as SubmoduleInfo[]),
            needsCount ? git.count(root).catch(() => null) : Promise.resolve(null),
            staticPromise,
          ])
        if (request !== refreshRequestRef.current) return
        const [version, url, signature] = statics
        staticCacheRef.current = { repo: root, version, remoteUrl: url, gpg: signature }
        if (full) {
          setReflog([])
          setReflogLoaded(false)
        }
        if (nextConflicts.length === 0) setMsg("")
        if (needsCount) countPendingRef.current = false
        if (nextTotal !== null) {
          countRepoRef.current = root
          setTotalCommits(nextTotal)
        }
        setStatus((prev) => (sameStatus(prev, nextStatus) ? prev : nextStatus))
        setBranches((prev) => (sameBranches(prev, nextBranches) ? prev : nextBranches))
        setConflicts((prev) => (sameConflicts(prev, nextConflicts) ? prev : nextConflicts))
        setTags((prev) => (sameStrings(prev, nextTags) ? prev : nextTags))
        setRemotes((prev) => (sameRemotes(prev, nextRemotes) ? prev : nextRemotes))
        setSubmodules((prev) => (sameSubmodules(prev, nextModules) ? prev : nextModules))
        setGitVersion((prev) => (prev === version ? prev : version))
        setRemoteUrl((prev) => (prev === url ? prev : url))
        setGpg((prev) => (prev === signature ? prev : signature))
      } catch (error) {
        countPendingRef.current = false
        if (request === refreshRequestRef.current && !silent) setMsg(String(error))
      } finally {
        if (request === refreshRequestRef.current && !silent) setBusy(false)
      }
    },
    [git, logPage.reset, graphPage.reset, setBusy, setMsg],
  )

  useEffect(() => {
    if (repo) void refresh(repo, "full")
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
    submodules,
    gitVersion,
    remoteUrl,
    gpg,
    logPage,
    graphPage,
    totalCommits,
    refresh,
  }
}
