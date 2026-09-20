export const READ_ONLY = new Set(["log", "status", "show", "rev-parse", "diff"])

export const BRANCH_LIST_FLAGS = ["--list", "-l", "-a", "-r", "--all", "--remotes"]

export const DANGEROUS = new Set(["merge", "commit", "push", "pull", "reset", "rebase", "revert", "cherry-pick"])

export const QUICK = ["log --oneline -5", "status --short", "branch"]

export const TEMPLATES = [
  "log --oneline -10",
  "log --graph --oneline -10",
  "status --short",
  "branch",
  "branch -d ",
  "checkout ",
  "checkout -b ",
  "switch ",
  "merge ",
  "merge --abort",
  "commit -m ",
  "add -A",
  "tag ",
  "fetch --prune",
  "pull",
  "push",
  "stash",
  "stash pop",
  "reset --soft ",
  "rebase ",
  "rebase --abort",
  "revert ",
  "cherry-pick ",
  "reflog -10",
  "diff --stat",
  "show ",
  "submodule status",
  "submodule foreach ",
  "help",
  "clear",
]

export const INTENT_VERBS = [
  "branch",
  "checkout",
  "switch",
  "merge",
  "commit",
  "add",
  "tag",
  "fetch",
  "pull",
  "push",
  "log",
  "status",
  "show",
  "diff",
  "rev-parse",
  "stash",
  "reset",
  "rebase",
  "revert",
  "cherry-pick",
  "reflog",
  "submodule",
  "help",
  "clear",
]
