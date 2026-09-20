import { invoke } from "@tauri-apps/api/core"
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

export const DEFAULT_TEMPLATE_FOLDER = ".reflog/templates"

async function invokeOrDefault<T>(command: string, args: Record<string, unknown> | undefined, fallback: T): Promise<T> {
  try {
    return await invoke<T>(command, args)
  } catch {
    return fallback
  }
}

export const gitApi = {
  checkRepo: (path: string) => invokeOrDefault<boolean>("check_repo", { path }, false),
  repoRoot: (path: string) => invoke<string>("repo_root", { path }),
  status: (repoPath: string) => invoke<StatusResult>("git_status", { repoPath }),
  branches: (repoPath: string) => invokeOrDefault<BranchInfo[]>("git_branches", { repoPath }, []),
  log: (repoPath: string, limit?: number) => invokeOrDefault<CommitInfo[]>("git_log", { repoPath, limit }, []),
  graph: (repoPath: string, limit = 100) => invokeOrDefault<CommitInfo[]>("git_graph", { repoPath, limit }, []),
  reflog: (repoPath: string, limit?: number) => invokeOrDefault<ReflogEntry[]>("git_reflog", { repoPath, limit }, []),
  commitFiles: (repoPath: string, rev: string) =>
    invokeOrDefault<CommitFileChange[]>("git_commit_files", { repoPath, rev }, []),
  commitDiff: (repoPath: string, rev: string, file?: string) =>
    invoke<string>("git_commit_diff", { repoPath, rev, file }),
  diff: (repoPath: string, file: string, staged: boolean) => invoke<string>("git_diff", { repoPath, file, staged }),
  fileContent: (repoPath: string, file: string) => invoke<string>("get_file_content", { repoPath, file }),
  saveContent: (repoPath: string, file: string, content: string) =>
    invoke<void>("save_file_content", { repoPath, file, content }),
  writeTextFile: (path: string, content: string) => invoke<void>("write_text_file", { path, content }),
  conflicted: (repoPath: string) => invokeOrDefault<ConflictFile[]>("get_conflicted_files", { repoPath }, []),
  parse: (content: string) => invoke<ConflictBlock[]>("parse_conflicts", { content }),
  add: (repoPath: string, files: string[]) => invoke<string>("git_add", { repoPath, files }),
  commit: (repoPath: string, message: string, signoff = false, sign = false) =>
    invoke<string>("git_commit", { repoPath, message, signoff, sign }),
  amendCommit: (repoPath: string, message: string, signoff = false, sign = false) =>
    invoke<string>("git_amend_commit", { repoPath, message, signoff, sign }),
  checkout: (repoPath: string, branch: string, create = false) =>
    invoke<string>("git_checkout", { repoPath, branch, create }),
  mergeOpts: (repoPath: string, branch: string, squash: boolean, noFf: boolean) =>
    invoke<string>("git_merge_opts", { repoPath, branch, squash, noFf }),
  mergeAbort: (repoPath: string) => invoke<string>("git_merge_abort", { repoPath }),
  fetch: (repoPath: string, prune = false) => invoke<string>("git_fetch", { repoPath, prune }),
  pull: (repoPath: string) => invoke<string>("git_pull", { repoPath }),
  push: (repoPath: string) => invoke<string>("git_push", { repoPath }),
  stash: (repoPath: string, message?: string) => invoke<string>("git_stash", { repoPath, message }),
  stashPop: (repoPath: string) => invoke<string>("git_stash_pop", { repoPath }),
  stashList: (repoPath: string) => invokeOrDefault<StashItem[]>("git_stash_list", { repoPath }, []),
  stashShow: (repoPath: string, index: number) => invoke<string>("git_stash_show", { repoPath, index }),
  stashDrop: (repoPath: string, index: number) => invoke<string>("git_stash_drop", { repoPath, index }),
  stashApply: (repoPath: string, index: number) => invoke<string>("git_stash_apply", { repoPath, index }),
  cherryPick: (repoPath: string, hash: string) => invoke<string>("git_cherry_pick", { repoPath, hash }),
  cherryPickContinue: (repoPath: string) => invoke<string>("git_cherry_pick_continue", { repoPath }),
  cherryPickAbort: (repoPath: string) => invoke<string>("git_cherry_pick_abort", { repoPath }),
  revert: (repoPath: string, hash: string) => invoke<string>("git_revert", { repoPath, hash }),
  revertContinue: (repoPath: string) => invoke<string>("git_revert_continue", { repoPath }),
  revertAbort: (repoPath: string) => invoke<string>("git_revert_abort", { repoPath }),
  reset: (repoPath: string, target: string, mode: "soft" | "mixed" | "hard" = "mixed") =>
    invoke<string>("git_reset", { repoPath, target, mode }),
  unstage: (repoPath: string, file: string) => invoke<string>("git_unstage", { repoPath, file }),
  discard: (repoPath: string, file: string) => invoke<string>("git_discard", { repoPath, file }),
  version: () => invoke<string>("git_version"),
  remoteUrl: (repoPath: string) => invokeOrDefault<string>("git_remote_url", { repoPath }, ""),
  gpg: (repoPath: string) => invokeOrDefault<string>("git_gpg", { repoPath }, ""),
  clone: (url: string, path: string) => invoke<string>("git_clone", { url, path }),
  blame: (repoPath: string, file: string) => invoke<string>("git_blame", { repoPath, file }),
  lsFiles: (repoPath: string) => invokeOrDefault<string[]>("git_ls_files", { repoPath }, []),
  applyPatch: (repoPath: string, patch: string, cached: boolean, reverse: boolean) =>
    invoke<string>("git_apply_patch", { repoPath, patch, cached, reverse }),
  configGet: (repoPath: string, key: string, global = false) =>
    invoke<string>("git_config_get", { repoPath, key, global }),
  configSet: (repoPath: string, key: string, value: string, global = false) =>
    invoke<string>("git_config_set", { repoPath, key, value, global }),
  identity: (repoPath: string) => invokeOrDefault<Identity>("git_identity", { repoPath }, { name: "", email: "" }),
  branchDelete: (repoPath: string, name: string, force = false) =>
    invoke<string>("git_branch_delete", { repoPath, name, force }),
  branchRename: (repoPath: string, oldName: string, newName: string) =>
    invoke<string>("git_branch_rename", { repoPath, old: oldName, new: newName }),
  tagList: (repoPath: string) => invokeOrDefault<string[]>("git_tag_list", { repoPath }, []),
  tagCreate: (repoPath: string, name: string, message?: string) =>
    invoke<string>("git_tag_create", { repoPath, name, message }),
  tagDelete: (repoPath: string, name: string) => invoke<string>("git_tag_delete", { repoPath, name }),
  remoteList: (repoPath: string) => invokeOrDefault<RemoteInfo[]>("git_remote_list", { repoPath }, []),
  remoteAdd: (repoPath: string, name: string, url: string) => invoke<string>("git_remote_add", { repoPath, name, url }),
  remoteRemove: (repoPath: string, name: string) => invoke<string>("git_remote_remove", { repoPath, name }),
  templateList: (repoPath: string, folder: string) =>
    invokeOrDefault<string[]>("git_template_list", { repoPath, folder }, []),
  templateRead: (repoPath: string, folder: string, name: string) =>
    invoke<string>("git_template_read", { repoPath, folder, name }),
  templateWrite: (repoPath: string, folder: string, name: string, content: string) =>
    invoke<string>("git_template_write", { repoPath, folder, name, content }),
  templateDelete: (repoPath: string, folder: string, name: string) =>
    invoke<string>("git_template_delete", { repoPath, folder, name }),
  run: (repoPath: string, args: string[]) => invoke<string>("git_run", { repoPath, args }),
  submodules: (repoPath: string) => invokeOrDefault<SubmoduleInfo[]>("git_submodule_list", { repoPath }, []),
  submoduleUpdate: (repoPath: string, submodulePath?: string) =>
    invoke<string>("git_submodule_update", { repoPath, submodulePath }),
}

export type GitApi = typeof gitApi
