import { useMemo } from "react"
import { mergeStatsUseCase } from "../../../data"
import type { CommitInfo, Lang } from "../../../types"
import { useMerge } from "../merge/useMerge"
import { useRepoCore } from "./useRepoCore"
import { useStaging } from "./useStaging"
import { useStableSlice } from "../useStableSlice"

export type { View } from "./useRepoCore"

export interface CompareRefsResult {
  base: string
  target: string
  mergeBase: string
  files: { path: string; added: number; removed: number }[]
  ahead: CommitInfo[]
  behind: CommitInfo[]
  diff: string
}

export function useRepository(lang: Lang) {
  const core = useRepoCore(lang)
  const staging = useStaging({
    lang,
    repo: core.repo,
    submodules: core.submodules,
    runAction: core.runAction,
    requestConfirm: core.requestConfirm,
    setMsg: core.setMsg,
  })
  const merge = useMerge({
    lang,
    repo: core.repo,
    status: core.status,
    conflicts: core.conflicts,
    setConflicts: core.setConflicts,
    refresh: core.refresh,
    runAction: core.runAction,
    setBusy: core.setBusy,
    setMsg: core.setMsg,
    readCommitMessage: () => staging.commitMsg,
    clearCommitMessage: () => staging.setCommitMsg(""),
  })

  const stats = useMemo(
    () => mergeStatsUseCase.mergeStats(core.conflicts, merge.resolvedMap),
    [core.conflicts, merge.resolvedMap],
  )
  const unmergedCount = useMemo(
    () => core.status?.files.filter((file) => file.unmerged).length ?? core.conflicts.length,
    [core.status, core.conflicts.length],
  )

  const coreSlice = useStableSlice({
    repoInput: core.repoInput,
    setRepoInput: core.setRepoInput,
    repo: core.repo,
    recents: core.recents,
    repoChain: core.repoChain,
    parentRepo: core.parentRepo,
    isSubmodule: core.isSubmodule,
    openRecent: core.openRecent,
    clearRecents: core.clearRecents,
    removeRecent: core.removeRecent,
    status: core.status,
    branches: core.branches,
    localBranches: core.localBranches,
    tags: core.tags,
    remotes: core.remotes,
    submodules: core.submodules,
    log: core.log,
    graph: core.graph,
    totalCommits: core.totalCommits,
    conflicts: core.conflicts,
    busy: core.busy,
    busyStartedAt: core.busyStartedAt,
    canUndo: core.canUndo,
    canRedo: core.canRedo,
    undoLabel: core.undoLabel,
    undoLast: core.undoLast,
    redoLast: core.redoLast,
    clearUndoStack: core.clearUndoStack,
    busyLabel: core.busyLabel,
    opening: core.opening,
    msg: core.msg,
    setMsg: core.setMsg,
    lastError: core.lastError,
    clearError: core.clearError,
    gitVersion: core.gitVersion,
    remoteUrl: core.remoteUrl,
    gpg: core.gpg,
    repoName: core.repoName,
    stats,
    unmergedCount,
    refresh: core.refresh,
    handleOpen: core.handleOpen,
    handleBrowse: core.handleBrowse,
    pickDir: core.pickDir,
    cloneRepo: core.cloneRepo,
    initRepo: core.initRepo,
    runAction: core.runAction,
    checkoutBranch: core.checkoutBranch,
    createBranchFrom: core.createBranchFrom,
    deleteBranch: core.deleteBranch,
    renameBranch: core.renameBranch,
    fetchPrune: core.fetchPrune,
    fetchFromRemote: core.fetchFromRemote,
    pushForce: core.pushForce,
    pushTags: core.pushTags,
    deleteRemoteBranch: core.deleteRemoteBranch,
    setUpstream: core.setUpstream,
    createTag: core.createTag,
    deleteTag: core.deleteTag,
    pushTag: core.pushTag,
    addRemote: core.addRemote,
    removeRemote: core.removeRemote,
    pullIt: core.pullIt,
    pushIt: core.pushIt,
    amendCommit: core.amendCommit,
    loadMoreLog: core.loadMoreLog,
    loadMoreGraph: core.loadMoreGraph,
    logLoading: core.logLoading,
    graphLoading: core.graphLoading,
    logHasMore: core.logHasMore,
    graphHasMore: core.graphHasMore,
    openTerminalHint: core.openTerminalHint,
    pendingConfirm: core.pendingConfirm,
    requestConfirm: core.requestConfirm,
    reflog: core.reflog,
    reflogLoading: core.reflogLoading,
    reflogLoaded: core.reflogLoaded,
    loadReflog: core.loadReflog,
    cherryPick: core.cherryPick,
    cherryPickContinue: core.cherryPickContinue,
    cherryPickAbort: core.cherryPickAbort,
    revert: core.revert,
    revertContinue: core.revertContinue,
    revertAbort: core.revertAbort,
    resetBranch: core.resetBranch,
    rebaseStart: core.rebaseStart,
    rebaseContinue: core.rebaseContinue,
    rebaseAbort: core.rebaseAbort,
    loadCommitFiles: core.loadCommitFiles,
    loadCommitDiff: core.loadCommitDiff,
    compareRefs: core.compareRefs,
    searchHistory: core.searchHistory,
  })

  const stagingSlice = useStableSlice({
    selectedFile: staging.selectedFile,
    diff: staging.diff,
    diffStaged: staging.diffStaged,
    diffLoaded: staging.diffLoaded,
    diffLoading: staging.diffLoading,
    diffError: staging.diffError,
    blameFile: staging.blameFile,
    blameLines: staging.blameLines,
    blameLoading: staging.blameLoading,
    blameError: staging.blameError,
    blameStale: staging.blameStale,
    trackedFiles: staging.trackedFiles,
    loadBlame: staging.loadBlame,
    loadTracked: staging.loadTracked,
    loadDiff: staging.loadDiff,
    selectDiff: staging.selectDiff,
    newBranch: staging.newBranch,
    setNewBranch: staging.setNewBranch,
    stashMsg: staging.stashMsg,
    setStashMsg: staging.setStashMsg,
    stashKeepIndex: staging.stashKeepIndex,
    setStashKeepIndex: staging.setStashKeepIndex,
    stashStagedOnly: staging.stashStagedOnly,
    setStashStagedOnly: staging.setStashStagedOnly,
    stashPaths: staging.stashPaths,
    setStashPaths: staging.setStashPaths,
    stashes: staging.stashes,
    loadStashes: staging.loadStashes,
    stashApply: staging.stashApply,
    stashApplyFile: staging.stashApplyFile,
    stashBranch: staging.stashBranch,
    stashDrop: staging.stashDrop,
    stashShow: staging.stashShow,
    stashPush: staging.stashPush,
    stashPopIt: staging.stashPopIt,
    stashClear: staging.stashClear,
    submodules: staging.submodules,
    submoduleUpdate: staging.submoduleUpdate,
    submoduleSync: staging.submoduleSync,
    submoduleAdd: staging.submoduleAdd,
    submoduleRemove: staging.submoduleRemove,
    createBranch: staging.createBranch,
    stageFile: staging.stageFile,
    unstageFile: staging.unstageFile,
    discardFile: staging.discardFile,
    stageHunk: staging.stageHunk,
    unstageHunk: staging.unstageHunk,
    discardHunk: staging.discardHunk,
    stageSelected: staging.stageSelected,
    unstageSelected: staging.unstageSelected,
    stageAll: staging.stageAll,
    stageFiles: staging.stageFiles,
    unstageFiles: staging.unstageFiles,
    discardFiles: staging.discardFiles,
    editingFile: staging.editingFile,
    editContent: staging.editContent,
    editDraft: staging.editDraft,
    setEditDraft: staging.setEditDraft,
    editLoading: staging.editLoading,
    openEditor: staging.openEditor,
    closeEditor: staging.closeEditor,
    saveEditor: staging.saveEditor,
  })

  const commitSlice = useStableSlice({
    commitMsg: staging.commitMsg,
    setCommitMsg: staging.setCommitMsg,
    doCommit: staging.doCommit,
    stageAll: staging.stageAll,
  })

  const mergeSlice = useStableSlice({
    activeConflict: merge.activeConflict,
    editorContent: merge.editorContent,
    setEditorContent: merge.setEditorContent,
    mergeBranch: merge.mergeBranch,
    setMergeBranch: merge.setMergeBranch,
    mergeSquash: merge.mergeSquash,
    setMergeSquash: merge.setMergeSquash,
    mergeNoFF: merge.mergeNoFF,
    setMergeNoFF: merge.setMergeNoFF,
    resolvedMap: merge.resolvedMap,
    saveConflictFile: merge.saveConflictFile,
    resolveConflictFile: merge.resolveConflictFile,
    continueMerge: merge.continueMerge,
    startMerge: merge.startMerge,
    selectConflictFile: merge.selectConflictFile,
    abortMerge: merge.abortMerge,
  })

  const flat = useStableSlice({ ...coreSlice, ...stagingSlice, ...commitSlice, ...mergeSlice })

  return { core: coreSlice, staging: stagingSlice, commit: commitSlice, merge: mergeSlice, flat }
}

export type RepositoryCore = ReturnType<typeof useRepository>["core"]
export type RepositoryStaging = ReturnType<typeof useRepository>["staging"]
export type RepositoryCommit = ReturnType<typeof useRepository>["commit"]
export type RepositoryMerge = ReturnType<typeof useRepository>["merge"]
export type Repository = RepositoryCore & RepositoryStaging & RepositoryCommit & RepositoryMerge
