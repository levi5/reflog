import type {
  BranchInfo,
  CommitFileChange,
  CommitInfo,
  ConflictBlock,
  ConflictFile,
  Identity,
  ReflogEntry,
  RemoteInfo,
  StashItem,
  StatusResult,
  SubmoduleInfo,
} from "../../types"

export interface IGitApi {
  checkRepo(path: string): Promise<boolean>
  repoRoot(path: string): Promise<string>
  status(repoPath: string): Promise<StatusResult>
  branches(repoPath: string): Promise<BranchInfo[]>
  count(repoPath: string): Promise<number>
  log(repoPath: string, limit?: number, skip?: number): Promise<CommitInfo[]>
  graph(repoPath: string, limit?: number, skip?: number): Promise<CommitInfo[]>
  reflog(repoPath: string, limit?: number, skip?: number): Promise<ReflogEntry[]>
  commitFiles(repoPath: string, rev: string): Promise<CommitFileChange[]>
  commitDiff(repoPath: string, rev: string, file?: string): Promise<string>
  diff(repoPath: string, file: string, staged: boolean): Promise<string>
  fileContent(repoPath: string, file: string): Promise<string>
  saveContent(repoPath: string, file: string, content: string): Promise<void>
  conflicted(repoPath: string): Promise<ConflictFile[]>
  parse(content: string): Promise<ConflictBlock[]>
  add(repoPath: string, files: string[]): Promise<string>
  commit(repoPath: string, message: string, signoff?: boolean, sign?: boolean): Promise<string>
  amendCommit(repoPath: string, message: string, signoff?: boolean, sign?: boolean): Promise<string>
  checkout(repoPath: string, branch: string, create?: boolean): Promise<string>
  branchDelete(repoPath: string, name: string, force?: boolean): Promise<string>
  branchRename(repoPath: string, oldName: string, newName: string): Promise<string>
  cherryPick(repoPath: string, hash: string): Promise<string>
  cherryPickContinue(repoPath: string): Promise<string>
  cherryPickAbort(repoPath: string): Promise<string>
  revert(repoPath: string, hash: string): Promise<string>
  revertContinue(repoPath: string): Promise<string>
  revertAbort(repoPath: string): Promise<string>
  reset(repoPath: string, target: string, mode?: "soft" | "mixed" | "hard"): Promise<string>
  mergeOpts(repoPath: string, branch: string, squash: boolean, noFf: boolean): Promise<string>
  mergeAbort(repoPath: string): Promise<string>
  fetch(repoPath: string, prune?: boolean): Promise<string>
  pull(repoPath: string): Promise<string>
  push(repoPath: string): Promise<string>
  run(repoPath: string, args: string[]): Promise<string>
  version(): Promise<string>
  remoteUrl(repoPath: string): Promise<string>
  gpg(repoPath: string): Promise<string>
  clone(url: string, path: string): Promise<string>
  blame(repoPath: string, file: string): Promise<string>
  tagList(repoPath: string): Promise<string[]>
  tagCreate(repoPath: string, name: string, message?: string): Promise<string>
  tagDelete(repoPath: string, name: string): Promise<string>
  remoteList(repoPath: string): Promise<RemoteInfo[]>
  remoteAdd(repoPath: string, name: string, url: string): Promise<string>
  remoteRemove(repoPath: string, name: string): Promise<string>
  templateList(repoPath: string, folder: string): Promise<string[]>
  templateRead(repoPath: string, folder: string, name: string): Promise<string>
  templateWrite(repoPath: string, folder: string, name: string, content: string): Promise<string>
  templateDelete(repoPath: string, folder: string, name: string): Promise<string>
  submodules(repoPath: string): Promise<SubmoduleInfo[]>
  submoduleUpdate(repoPath: string, submodulePath?: string): Promise<string>
  stash(repoPath: string, message?: string): Promise<string>
  stashPop(repoPath: string): Promise<string>
  stashList(repoPath: string): Promise<StashItem[]>
  stashShow(repoPath: string, index: number): Promise<string>
  stashDrop(repoPath: string, index: number): Promise<string>
  stashApply(repoPath: string, index: number): Promise<string>
  applyPatch(repoPath: string, patch: string, cached: boolean, reverse: boolean): Promise<string>
  configGet(repoPath: string, key: string, global?: boolean): Promise<string>
  configSet(repoPath: string, key: string, value: string, global?: boolean): Promise<string>
  identity(repoPath: string): Promise<Identity>
}
