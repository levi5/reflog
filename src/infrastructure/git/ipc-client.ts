import { invoke } from "@tauri-apps/api/core"
import type {
  BranchInfo,
  CommitFileChange,
  CommitInfo,
  ConflictBlock,
  ConflictFile,
  Identity,
  RebaseOp,
  ReflogEntry,
  RemoteInfo,
  StashItem,
  StatusResult,
  SubmoduleInfo,
} from "../../types"

export const DEFAULT_TEMPLATE_FOLDER = ".reflog/templates"

export class GitApiError extends Error {
  constructor(
    message: string,
    public readonly command: string,
    public readonly originalError?: unknown,
  ) {
    super(message)
    this.name = "GitApiError"
  }
}

async function invokeTyped<T>(command: string, args: Record<string, unknown> | undefined): Promise<T> {
  try {
    return await invoke<T>(command, args)
  } catch (e) {
    throw new GitApiError(e instanceof Error ? e.message : String(e), command, e)
  }
}

export const gitApi = {
  checkRepo: (path: string) => invokeTyped<boolean>("check_repo", { path }),
  repoRoot: (path: string) => invokeTyped<string>("repo_root", { path }),
  init: (path: string) => invokeTyped<string>("init_repo", { path }),
  status: (repoPath: string) => invokeTyped<StatusResult>("git_status", { repoPath }),
  branches: (repoPath: string) => invokeTyped<BranchInfo[]>("git_branches", { repoPath }),
  count: (repoPath: string) => invokeTyped<number>("git_count", { repoPath }),
  log: (repoPath: string, limit?: number, skip?: number) =>
    invokeTyped<CommitInfo[]>("git_log", { repoPath, limit, skip }),
  graph: (repoPath: string, limit = 100, skip?: number) =>
    invokeTyped<CommitInfo[]>("git_graph", { repoPath, limit, skip }),
  reflog: (repoPath: string, limit?: number, skip?: number) =>
    invokeTyped<ReflogEntry[]>("git_reflog", { repoPath, limit, skip }),
  commitFiles: (repoPath: string, rev: string) =>
    invokeTyped<CommitFileChange[]>("git_commit_files", { repoPath, rev }),
  commitDiff: (repoPath: string, rev: string, file?: string) =>
    invokeTyped<string>("git_commit_diff", { repoPath, rev, file }),
  diff: (repoPath: string, file: string, staged: boolean) =>
    invokeTyped<string>("git_diff", { repoPath, file, staged }),
  fileContent: (repoPath: string, file: string) => invokeTyped<string>("get_file_content", { repoPath, file }),
  saveContent: (repoPath: string, file: string, content: string) =>
    invokeTyped<void>("save_file_content", { repoPath, file, content }),
  conflicted: (repoPath: string) => invokeTyped<ConflictFile[]>("get_conflicted_files", { repoPath }),
  parse: (content: string) => invokeTyped<ConflictBlock[]>("parse_conflicts", { content }),
  add: (repoPath: string, files: string[]) => invokeTyped<string>("git_add", { repoPath, files }),
  commit: (repoPath: string, message: string, signoff = false, sign = false) =>
    invokeTyped<string>("git_commit", { repoPath, message, signoff, sign }),
  amendCommit: (repoPath: string, message: string, signoff = false, sign = false) =>
    invokeTyped<string>("git_amend_commit", { repoPath, message, signoff, sign }),
  checkout: (repoPath: string, branch: string, create = false) =>
    invokeTyped<string>("git_checkout", { repoPath, branch, create }),
  mergeOpts: (repoPath: string, branch: string, squash: boolean, noFf: boolean) =>
    invokeTyped<string>("git_merge_opts", { repoPath, branch, squash, noFf }),
  mergeAbort: (repoPath: string) => invokeTyped<string>("git_merge_abort", { repoPath }),
  fetch: (repoPath: string, prune = false) => invokeTyped<string>("git_fetch", { repoPath, prune }),
  pull: (repoPath: string) => invokeTyped<string>("git_pull", { repoPath }),
  push: (repoPath: string) => invokeTyped<string>("git_push", { repoPath }),
  stash: (repoPath: string, message?: string) => invokeTyped<string>("git_stash", { repoPath, message }),
  stashPop: (repoPath: string) => invokeTyped<string>("git_stash_pop", { repoPath }),
  stashList: (repoPath: string) => invokeTyped<StashItem[]>("git_stash_list", { repoPath }),
  stashShow: (repoPath: string, index: number) => invokeTyped<string>("git_stash_show", { repoPath, index }),
  stashDrop: (repoPath: string, index: number) => invokeTyped<string>("git_stash_drop", { repoPath, index }),
  stashApply: (repoPath: string, index: number) => invokeTyped<string>("git_stash_apply", { repoPath, index }),
  cherryPick: (repoPath: string, hash: string) => invokeTyped<string>("git_cherry_pick", { repoPath, hash }),
  cherryPickContinue: (repoPath: string) => invokeTyped<string>("git_cherry_pick_continue", { repoPath }),
  cherryPickAbort: (repoPath: string) => invokeTyped<string>("git_cherry_pick_abort", { repoPath }),
  revert: (repoPath: string, hash: string) => invokeTyped<string>("git_revert", { repoPath, hash }),
  revertContinue: (repoPath: string) => invokeTyped<string>("git_revert_continue", { repoPath }),
  revertAbort: (repoPath: string) => invokeTyped<string>("git_revert_abort", { repoPath }),
  reset: (repoPath: string, target: string, mode: "soft" | "mixed" | "hard" = "mixed") =>
    invokeTyped<string>("git_reset", { repoPath, target, mode }),
  unstage: (repoPath: string, file: string) => invokeTyped<string>("git_unstage", { repoPath, file }),
  discard: (repoPath: string, file: string) => invokeTyped<string>("git_discard", { repoPath, file }),
  version: () => invokeTyped<string>("git_version", {}),
  remoteUrl: (repoPath: string) => invokeTyped<string>("git_remote_url", { repoPath }),
  gpg: (repoPath: string) => invokeTyped<string>("git_gpg", { repoPath }),
  clone: (url: string, path: string) => invokeTyped<string>("git_clone", { url, path }),
  blame: (repoPath: string, file: string) => invokeTyped<string>("git_blame", { repoPath, file }),
  lsFiles: (repoPath: string) => invokeTyped<string[]>("git_ls_files", { repoPath }),
  applyPatch: (repoPath: string, patch: string, cached: boolean, reverse: boolean) =>
    invokeTyped<string>("git_apply_patch", { repoPath, patch, cached, reverse }),
  configGet: (repoPath: string, key: string, global = false) =>
    invokeTyped<string>("git_config_get", { repoPath, key, global }),
  configSet: (repoPath: string, key: string, value: string, global = false) =>
    invokeTyped<string>("git_config_set", { repoPath, key, value, global }),
  identity: (repoPath: string) => invokeTyped<Identity>("git_identity", { repoPath }),
  branchDelete: (repoPath: string, name: string, force = false) =>
    invokeTyped<string>("git_branch_delete", { repoPath, name, force }),
  branchRename: (repoPath: string, oldName: string, newName: string) =>
    invokeTyped<string>("git_branch_rename", { repoPath, old: oldName, new: newName }),
  tagList: (repoPath: string) => invokeTyped<string[]>("git_tag_list", { repoPath }),
  tagCreate: (repoPath: string, name: string, message?: string) =>
    invokeTyped<string>("git_tag_create", { repoPath, name, message }),
  tagDelete: (repoPath: string, name: string) => invokeTyped<string>("git_tag_delete", { repoPath, name }),
  remoteList: (repoPath: string) => invokeTyped<RemoteInfo[]>("git_remote_list", { repoPath }),
  remoteAdd: (repoPath: string, name: string, url: string) =>
    invokeTyped<string>("git_remote_add", { repoPath, name, url }),
  remoteRemove: (repoPath: string, name: string) => invokeTyped<string>("git_remote_remove", { repoPath, name }),
  templateList: (repoPath: string, folder: string) => invokeTyped<string[]>("git_template_list", { repoPath, folder }),
  templateRead: (repoPath: string, folder: string, name: string) =>
    invokeTyped<string>("git_template_read", { repoPath, folder, name }),
  templateWrite: (repoPath: string, folder: string, name: string, content: string) =>
    invokeTyped<string>("git_template_write", { repoPath, folder, name, content }),
  templateDelete: (repoPath: string, folder: string, name: string) =>
    invokeTyped<string>("git_template_delete", { repoPath, folder, name }),
  run: (repoPath: string, args: string[]) => invokeTyped<string>("git_run", { repoPath, args }),
  rebaseCommits: (repoPath: string, onto: string) =>
    invokeTyped<CommitInfo[]>("git_rebase_commits", { repoPath, onto }),
  rebaseStart: (repoPath: string, onto: string, ops: RebaseOp[]) =>
    invokeTyped<string>("git_rebase_start", { repoPath, onto, ops }),
  rebaseContinue: (repoPath: string) => invokeTyped<string>("git_rebase_continue", { repoPath }),
  rebaseAbort: (repoPath: string) => invokeTyped<string>("git_rebase_abort", { repoPath }),
  submodules: (repoPath: string) => invokeTyped<SubmoduleInfo[]>("git_submodule_list", { repoPath }),
  submoduleUpdate: (repoPath: string, submodulePath?: string) =>
    invokeTyped<string>("git_submodule_update", { repoPath, submodulePath }),
}

export type GitApi = typeof gitApi
