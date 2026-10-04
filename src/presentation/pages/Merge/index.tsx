import { conflictResolverUseCase, mergeStatsUseCase } from "../../../data"
import { useCallback, useEffect, useState } from "react"
import { useOutletContext } from "react-router-dom"

import { Merge } from "../../components/Merge"
import { EmptyState } from "../../components/Empty/State"
import { Resizable } from "@/presentation/components/Resizable"

import { t } from "../../../i18n"
import { gitApi } from "../../../infrastructure/git"
import { useRepo, useSettingsContext } from "../../context"
import type { AppOutletContext } from "../../layout/App"
import type { Choice } from "../../../domain/entities/conflict/conflicts"
import type { CommitInfo, RebaseOp } from "../../../types"

export function MergePage() {
  const { lang } = useSettingsContext()
  const { showRebase, toggleRebase, setRebaseCount } = useOutletContext<AppOutletContext>()
  const [hunkIndex, setHunkIndex] = useState(0)
  const [filter, setFilter] = useState("")
  const repo = useRepo()
  const activeFile = repo.conflicts.find((file) => file.path === repo.activeConflict)
  const activeBlocks = conflictResolverUseCase.parseConflicts(repo.editorContent)
  const resolved = Object.entries(repo.resolvedMap)
    .filter(([p]) => mergeStatsUseCase.matchesQuery(p, filter))
    .map(([path, count]): { path: string; count: number } => ({ path, count }))

  const select = (path: string) => {
    repo.selectConflictFile(path)
    setHunkIndex(0)
  }
  const currentBranch = repo.status?.branch ?? ""
  const localBranches = repo.branches.filter((branch) => !branch.remote).map((branch) => branch.name)
  const defaultOnto =
    repo.branches.find((branch) => branch.name === currentBranch)?.upstream ??
    (localBranches.includes("main")
      ? "main"
      : localBranches.includes("master")
        ? "master"
        : (localBranches.find((branchName) => branchName !== currentBranch) ?? "main"))
  const [rebaseCommits, setRebaseCommits] = useState<CommitInfo[]>([])
  const [rebaseLoading, setRebaseLoading] = useState(false)
  const [rebaseError, setRebaseError] = useState<string | null>(null)

  const loadRebaseCommits = useCallback(
    async (onto: string) => {
      if (!repo.repo || !onto.trim()) return
      setRebaseLoading(true)
      setRebaseError(null)
      try {
        setRebaseCommits(await gitApi.rebaseCommits(repo.repo, onto.trim()))
      } catch (e) {
        setRebaseCommits([])
        setRebaseError(e instanceof Error ? e.message : String(e))
      } finally {
        setRebaseLoading(false)
      }
    },
    [repo.repo],
  )

  useEffect(() => {
    if (showRebase && repo.repo) {
      void loadRebaseCommits(defaultOnto)
    }
  }, [showRebase, repo.repo, defaultOnto, loadRebaseCommits])

  useEffect(() => {
    setRebaseCount(showRebase ? rebaseCommits.length : 0)
  }, [showRebase, rebaseCommits.length, setRebaseCount])

  const applyRebase = (onto: string, ops: RebaseOp[]) => {
    void repo.rebaseStart(onto, ops).then(() => {
      if (repo.repo) void loadRebaseCommits(onto)
    })
  }

  useEffect(() => {
    if (repo.conflicts.length === 0) return
    const stillListed = repo.conflicts.some((file) => file.path === repo.activeConflict)
    if (stillListed) return
    repo.selectConflictFile(repo.conflicts[0].path)
    setHunkIndex(0)
  }, [repo.conflicts, repo.activeConflict, repo.selectConflictFile])

  const applyToActive = (choice: Choice) => {
    const block = conflictResolverUseCase.parseConflicts(repo.editorContent)[hunkIndex]
    if (!block) return
    repo.setEditorContent(conflictResolverUseCase.applyChoiceToContent(repo.editorContent, block, choice, true))
  }

  return (
    <Resizable.Layout
      sidebarWidth={{ initial: 300, min: 220, max: 560, storageKey: "merge.side", label: t(lang, "resizeSidebar") }}
      sidebar={
        <>
          <Merge.Conflict.Sidebar
            conflicts={repo.conflicts}
            resolved={resolved}
            activePath={repo.activeConflict}
            filter={filter}
            progress={repo.stats.progress}
            progressLabel={`${repo.stats.progress}% (${repo.stats.resolvedFiles}/${repo.stats.totalFiles})`}
            onFilter={setFilter}
            onSelect={select}
          />
          <Merge.Conflict.Resolution onAccept={applyToActive} />
          <Merge.Conflict.Map blocks={activeBlocks} activeIndex={hunkIndex} onSelect={setHunkIndex} />
        </>
      }
      main={
        <>
          {!activeFile ? (
            <EmptyState message={t(lang, "noConflicts")} />
          ) : (
            <Merge.Conflict.Editor
              file={activeFile}
              content={repo.editorContent}
              hunkIndex={hunkIndex}
              saving={repo.busy}
              setContent={repo.setEditorContent}
              setHunkIndex={setHunkIndex}
              onSave={repo.saveConflictFile}
              onResolve={repo.resolveConflictFile}
            />
          )}
          {showRebase && (
            <Merge.Rebase.Strip
              branch={repo.status?.branch ?? ""}
              defaultOnto={defaultOnto}
              commits={rebaseCommits}
              loading={rebaseLoading}
              error={rebaseError}
              rebasing={repo.status?.rebasing ?? false}
              busy={repo.busy}
              onLoad={(onto) => void loadRebaseCommits(onto)}
              onApply={applyRebase}
              onContinue={() => void repo.rebaseContinue()}
              onAbort={() => void repo.rebaseAbort()}
              onClose={toggleRebase}
            />
          )}
        </>
      }
    />
  )
}
