import { useRepo } from "../../context/repository/repo-context"

export function useStagingState() {
  const repo = useRepo()
  return {
    selectedFile: repo.selectedFile,
    diff: repo.diff,
    diffStaged: repo.diffStaged,
    blameFile: repo.blameFile,
    blameLines: repo.blameLines,
    trackedFiles: repo.trackedFiles,
    loadDiff: repo.loadDiff,
    loadBlame: repo.loadBlame,
    loadTracked: repo.loadTracked,
    commitMsg: repo.commitMsg,
    setCommitMsg: repo.setCommitMsg,
    newBranch: repo.newBranch,
    setNewBranch: repo.setNewBranch,
    stashMsg: repo.stashMsg,
    setStashMsg: repo.setStashMsg,
    doCommit: repo.doCommit,
    createBranch: repo.createBranch,
    stashPush: repo.stashPush,
    stashPopIt: repo.stashPopIt,
    stageFile: repo.stageFile,
    unstageFile: repo.unstageFile,
    discardFile: repo.discardFile,
    stageHunk: repo.stageHunk,
    unstageHunk: repo.unstageHunk,
    discardHunk: repo.discardHunk,
    stageAll: repo.stageAll,
  }
}

export type StagingStateApi = ReturnType<typeof useStagingState>
