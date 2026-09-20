import { useRepo } from "../../context/repository/repo-context"

export function useMergeState() {
  const repo = useRepo()
  return {
    conflicts: repo.conflicts,
    activeConflict: repo.activeConflict,
    editorContent: repo.editorContent,
    setEditorContent: repo.setEditorContent,
    mergeBranch: repo.mergeBranch,
    setMergeBranch: repo.setMergeBranch,
    mergeSquash: repo.mergeSquash,
    setMergeSquash: repo.setMergeSquash,
    mergeNoFF: repo.mergeNoFF,
    setMergeNoFF: repo.setMergeNoFF,
    resolvedMap: repo.resolvedMap,
    stats: repo.stats,
    saveConflictFile: repo.saveConflictFile,
    resolveConflictFile: repo.resolveConflictFile,
    continueMerge: repo.continueMerge,
    startMerge: repo.startMerge,
    selectConflictFile: repo.selectConflictFile,
    abortMerge: repo.abortMerge,
  }
}

export type MergeStateApi = ReturnType<typeof useMergeState>
