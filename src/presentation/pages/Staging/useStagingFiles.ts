import { useCallback, useMemo } from "react"
import { mergeStatsUseCase } from "../../../data"
import type { FileStatus } from "../../../types"
import type { FileCheckSelection } from "../../components/Status/File"
import { groupBySection, type SectionId } from "../../components/Status/Sections/section-groups"
import { useFileSelection } from "../../hooks/staging/use-file-selection"

interface StagingFilesOptions {
  statusFiles: FileStatus[] | undefined
  query: string
  scope: string
  repoPath: string
  discardFiles: (files: FileStatus[]) => Promise<unknown>
}

const toPath = (file: FileStatus): string => file.path

function matchesScope(scope: string): boolean {
  return scope === "branches" || scope === "commits"
}

export function useStagingFiles({ statusFiles, query, scope, repoPath, discardFiles }: StagingFilesOptions) {
  const files = useMemo<FileStatus[]>(() => {
    const all = statusFiles ?? []
    if (matchesScope(scope)) return all
    return all.filter((file) => mergeStatsUseCase.matchesQuery(file.path, query))
  }, [statusFiles, query, scope])

  const grouped = useMemo(() => groupBySection(files), [files])

  const conflicts = useFileSelection(
    useMemo(() => grouped.conflicts.map(toPath), [grouped.conflicts]),
    repoPath,
  )
  const staged = useFileSelection(
    useMemo(() => grouped.staged.map(toPath), [grouped.staged]),
    repoPath,
  )
  const changes = useFileSelection(
    useMemo(() => grouped.changes.map(toPath), [grouped.changes]),
    repoPath,
  )

  const selections = useMemo<Record<SectionId, FileCheckSelection>>(
    () => ({
      conflicts: { checked: conflicts.checked, onToggle: conflicts.toggle },
      staged: { checked: staged.checked, onToggle: staged.toggle },
      changes: { checked: changes.checked, onToggle: changes.toggle },
    }),
    [conflicts.checked, conflicts.toggle, staged.checked, staged.toggle, changes.checked, changes.toggle],
  )

  const checkedPaths = useMemo(
    () => [...conflicts.checked, ...staged.checked, ...changes.checked],
    [conflicts.checked, staged.checked, changes.checked],
  )

  const checkedFiles = useMemo(() => {
    const wanted = new Set(checkedPaths)
    return files.filter((file) => wanted.has(file.path))
  }, [files, checkedPaths])

  const clearSelection = useCallback(() => {
    conflicts.clear()
    staged.clear()
    changes.clear()
  }, [conflicts.clear, staged.clear, changes.clear])

  const runBatch = useCallback(
    (work: (paths: string[]) => Promise<unknown>) => {
      if (checkedPaths.length === 0) return
      clearSelection()
      void work(checkedPaths)
    },
    [checkedPaths, clearSelection],
  )

  const discardSelection = useCallback(() => {
    if (checkedFiles.length === 0) return
    clearSelection()
    void discardFiles(checkedFiles)
  }, [checkedFiles, clearSelection, discardFiles])

  return { files, selections, checkedPaths, checkedFiles, clearSelection, runBatch, discardSelection }
}
