# API Reference (Tauri Commands)

All functions are invoked via `@tauri-apps/api/core` `invoke()`.
Argument names must match the Rust parameter names exactly.

```ts
import { invoke } from '@tauri-apps/api/core'

// Example
const status = await invoke<StatusResult>('git_status', { repoPath: '/path/to/repo' })
```

> The typed wrapper for every command below lives in `src/infrastructure/git/`
> (see the `IGitApi` interface in `src/infrastructure/git/types.ts`).
> Most commands run on a background thread via `run_blocking`
> (`spawn_blocking`); the exceptions are `get_file_content`,
> `save_file_content`, `get_conflicted_files`, `git_config_*` (reads),
> `git_template_*` and `take_cli_path`, which execute synchronously.

---

## Repository

### `check_repo`

Checks if a directory is a valid Git repository.

```ts
invoke<boolean>('check_repo', { path: string })
```

**Returns:** `true` if it's a Git repo, `false` otherwise.

---

### `repo_root`

Returns the repository root path.

```ts
invoke<string>('repo_root', { path: string })
```

**Returns:** Absolute path of the root (e.g., `/home/user/project`).

---

### `init_repo`

Initializes Git in a selected directory.

```ts
invoke<string>('init_repo', { path: string })
```

---

### `take_cli_path`

Returns the repository path passed on the command line
(`reflog <path>`), if any, and clears it. Takes no arguments.

```ts
invoke<string | null>('take_cli_path', {})
```

---

## Status

### `git_status`

Full working tree status.

```ts
interface StatusResult {
  root: string
  branch: string
  ahead: number
  behind: number
  files: FileStatus[]
  merging: boolean
  cherryPicking: boolean
  reverting: boolean
  rebasing: boolean
}

interface FileStatus {
  path: string
  x: string // index status
  y: string // working tree status
  staged: boolean
  unmerged: boolean
}

invoke<StatusResult>('git_status', { repoPath: string })
```

---

## History - Branches

### `git_branches`

Lists all branches (local and remote).

```ts
interface BranchInfo {
  name: string
  current: boolean
  remote: boolean
  ahead: number
  behind: number
  upstream?: string
}

invoke<BranchInfo[]>('git_branches', { repoPath: string })
```

---

## History - Log

### `git_count`

Total number of commits reachable from all refs.

```ts
invoke<number>('git_count', { repoPath: string })
```

---

### `git_log`

Paginated commit history. `limit` defaults to 50 and is clamped to 1000.

```ts
interface CommitInfo {
  hash: string
  short: string
  author: string
  date: string
  message: string
  parents: string[]
  refs: string[] // branch names, tags
}

invoke<CommitInfo[]>('git_log', { repoPath: string, limit?: number, skip?: number })
```

---

### `git_graph`

Commits used by the graph visualization.
Same shape as `git_log`; `limit` defaults to 100 (clamped to 1000).

```ts
invoke<CommitInfo[]>('git_graph', { repoPath: string, limit?: number, skip?: number })
```

---

### `git_reflog`

Reference log (HEAD movements). `limit` defaults to 50 (clamped to 1000).

```ts
interface ReflogEntry {
  hash: string
  short: string
  selector: string // e.g. 'HEAD@{0}'
  action: string
  author: string
  date: string
}

invoke<ReflogEntry[]>('git_reflog', { repoPath: string, limit?: number, skip?: number })
```

---

## History - Diff

### `git_commit_files`

Files changed in a commit.

```ts
interface CommitFileChange {
  status: string // A, M, D, R100, C100, etc.
  path: string
  oldPath?: string // for renames/copies
}

invoke<CommitFileChange[]>('git_commit_files', { repoPath: string, rev: string })
```

---

### `git_commit_diff`

Raw unified diff for a whole commit, or for one file in that commit.

```ts
invoke<string>('git_commit_diff', { repoPath: string, rev: string, file?: string })
```

---

### `git_diff`

Raw unified diff for a working-tree or staged file.

```ts
invoke<string>('git_diff', { repoPath: string, file: string, staged: boolean })
```

---


### `git_blame`

`blame --line-porcelain` output for a file, as raw text.

```ts
invoke<string>('git_blame', { repoPath: string, file: string })
```

---

### `git_ls_files`

Lists tracked files (paths only).

```ts
invoke<string[]>('git_ls_files', { repoPath: string })
```

---

## Staging

### `git_add`

Stage files. An empty array stages everything (`add -A`).

```ts
invoke<string>('git_add', { repoPath: string, files: string[] })
```

---

### `git_commit`

Creates a commit.

```ts
invoke<string>('git_commit', {
  repoPath: string,
  message: string,
  signoff: boolean,
  sign: boolean
})
```

---

### `git_amend_commit`

Amends the last commit. Same arguments as `git_commit`.

```ts
invoke<string>('git_amend_commit', {
  repoPath: string,
  message: string,
  signoff: boolean,
  sign: boolean
})
```

---

### `git_checkout`

Checkout a branch. Set `create` to create it (`checkout -b`), optionally starting
from an arbitrary ref: `from: 'main'`, `'v1.0'`, a commit hash, and so on.

```ts
invoke<string>('git_checkout', {
  repoPath: string,
  branch: string,
  create: boolean,
  from: string | null
})
```

---

### `git_cherry_pick`

Cherry-pick a commit.

```ts
invoke<string>('git_cherry_pick', { repoPath: string, hash: string })
```

### `git_cherry_pick_continue`

Continues after resolving conflicts.

```ts
invoke<string>('git_cherry_pick_continue', { repoPath: string })
```

### `git_cherry_pick_abort`

Aborts cherry-pick.

```ts
invoke<string>('git_cherry_pick_abort', { repoPath: string })
```

---

### `git_revert`

Reverts a commit (`--no-edit`).

```ts
invoke<string>('git_revert', { repoPath: string, hash: string })
```

### `git_revert_continue` / `git_revert_abort`

```ts
invoke<string>('git_revert_continue', { repoPath: string })
invoke<string>('git_revert_abort', { repoPath: string })
```

---

### `git_reset`

Reset to a target (`--soft`, `--mixed` or `--hard`).

```ts
invoke<string>('git_reset', {
  repoPath: string,
  target: string,
  mode: string // 'soft' | 'mixed' | 'hard'
})
```

---

### `git_unstage`

Unstage one file (equivalent to `reset HEAD -- <file>`).

```ts
invoke<string>('git_unstage', { repoPath: string, file: string })
```

---

### `git_discard`

Discards changes in one working-tree file
(`restore` with fallback to `checkout -- <file>`).

```ts
invoke<string>('git_discard', { repoPath: string, file: string })
```

---

### `git_apply_patch`

Applies a patch from a string via stdin
(`apply --unidiff-zero -`, plus `--cached` / `--reverse` when set).
Patches larger than 5 MiB are rejected.

```ts
invoke<string>('git_apply_patch', {
  repoPath: string,
  patch: string,
  cached: boolean,
  reverse: boolean
})
```

---

## Sync

### `git_merge_opts`

Merge a branch into the current one.
Exactly one of `squash` / `noFf` may be set.

```ts
invoke<string>('git_merge_opts', {
  repoPath: string,
  branch: string,
  squash: boolean,
  noFf: boolean
})
```

---

### `git_push`

Push to the upstream. If the branch has no upstream yet,
it retries once with `push -u origin <branch>`.

```ts
invoke<string>('git_push', { repoPath: string })
```

---

### `git_push_with`

Push with explicit intent. `force` uses `--force-with-lease` (never bare
`--force`), so a remote that moved unexpectedly is rejected instead of being
overwritten. Deleting a remote branch goes through the remote it lives on
(`origin/feat` -> `push origin --delete feat`).

```ts
interface PushOptions {
  force?: boolean
  pushTags?: boolean
  deleteRemoteBranch?: string
}

invoke<string>('git_push_with', {
  repoPath: string,
  force: boolean,
  pushTags: boolean,
  deleteRemoteBranch: string | null
})
```

---

### `git_set_upstream` / `git_unset_upstream`

Publishes a branch on a remote, or detaches it from its tracking ref.

```ts
invoke<string>('git_set_upstream', {
  repoPath: string,
  remote: string,
  branch: string
})
invoke<string>('git_unset_upstream', { repoPath: string, branch: string })
```

---

### `git_fetch_ref`

Fetches a single remote, optionally pruning and/or pulling tags.

```ts
invoke<string>('git_fetch_ref', {
  repoPath: string,
  remote: string,
  prune: boolean,
  tags: boolean
})
```

---

### `git_pull`

Pull from the upstream. If no upstream is configured,
it sets `origin/<branch>` as upstream and retries once.

```ts
invoke<string>('git_pull', { repoPath: string })
```

---

### `git_fetch`

Fetch all remotes (`fetch --all`, plus `--prune` when set).

```ts
invoke<string>('git_fetch', { repoPath: string, prune: boolean })
```

---

### `git_merge_abort`

Aborts in-progress merge.

```ts
invoke<string>('git_merge_abort', { repoPath: string })
```

---

### `git_stash`

Creates a stash (always with `--include-untracked`).
Pass an empty/missing message for no message.

```ts
invoke<string>('git_stash', { repoPath: string, message?: string })
```

---

### `git_stash_pop`

Pop stash (apply and remove the latest entry).

```ts
invoke<string>('git_stash_pop', { repoPath: string })
```

---

### `git_stash_list`

Lists stashes.

```ts
interface StashItem {
  index: number
  hash: string
  selector: string // e.g. 'stash@{0}'
  message: string
  author: string
  date: string
}

invoke<StashItem[]>('git_stash_list', { repoPath: string })
```

---

### `git_stash_show`

Shows the diff of a stash entry (`stash show -p`).

```ts
invoke<string>('git_stash_show', { repoPath: string, index: number })
```

---

### `git_stash_drop`

Removes a stash entry.

```ts
invoke<string>('git_stash_drop', { repoPath: string, index: number })
```

---

### `git_stash_apply`

Applies a stash entry without removing it.

```ts
invoke<string>('git_stash_apply', { repoPath: string, index: number })
```

---

## Compare - Branches

Every compare command resolves the merge base first, so the output reflects what
actually diverged rather than a plain two-dot range.

### `git_merge_base`

```ts
invoke<string>('git_merge_base', { repoPath: string, base: string, target: string })
```

---

### `git_diff_refs`

Unified diff between two refs. `statOnly` returns `--stat` instead.

```ts
invoke<string>('git_diff_refs', {
  repoPath: string,
  base: string,
  target: string,
  statOnly: boolean
})
```

---

### `git_diff_stat_files`

Per-file added/removed line counts. Binary files report `0/0`.

```ts
type CompareFileStat = { path: string; added: number; removed: number }

invoke<CompareFileStat[]>('git_diff_stat_files', {
  repoPath: string,
  base: string,
  target: string
})
```

---

### `git_commits_ahead` / `git_commits_behind`

Commits reachable from `target` (resp. `base`) but not from the merge base.

```ts
invoke<CommitInfo[]>('git_commits_ahead', {
  repoPath: string,
  base: string,
  target: string,
  limit?: number
})
```

---

### `git_compare_graph`

Decorated, topologically ordered commits between two refs, with the graph gutter
stripped so the UI can lay it out.

```ts
invoke<CommitInfo[]>('git_compare_graph', {
  repoPath: string,
  base: string,
  target: string,
  limit?: number
})
```

---

## Search - History

Filters are pushed straight into `git log`, so results cover the whole history
instead of only the commits the UI already paged in. Paths always go after a
`--` separator and are validated as repo-relative; `--follow` requires a path.

### `git_search_log` / `git_search_graph`

```ts
interface LogFilter {
  author?: string
  grep?: string
  path?: string
  since?: string
  until?: string
  pickaxe?: string
  follow?: boolean
}

invoke<CommitInfo[]>('git_search_log', {
  repoPath: string,
  filter: LogFilter,
  limit?: number,
  skip?: number
})
```

---

### `git_file_history`

Commit history for one file, following renames by default.

```ts
invoke<CommitInfo[]>('git_file_history', {
  repoPath: string,
  file: string,
  limit?: number,
  follow: boolean
})
```

---

## Refs - Branches

### `git_branch_delete`

Deletes a branch (`-d`, or `-D` when `force` is set).

```ts
invoke<string>('git_branch_delete', {
  repoPath: string,
  name: string,
  force: boolean
})
```

---

### `git_branch_rename`

Renames a branch (`branch -m`).

```ts
invoke<string>('git_branch_rename', {
  repoPath: string,
  old: string,
  new: string
})
```

---

## Refs - Tags

### `git_tag_list`

Lists tag names (sorted by creation date, newest first).

```ts
invoke<string[]>('git_tag_list', { repoPath: string })
```

---

### `git_tag_create`

Creates a lightweight tag, or an annotated tag (`-a -m`)
when a non-empty `message` is given.

```ts
invoke<string>('git_tag_create', {
  repoPath: string,
  name: string,
  message?: string
})
```

---

### `git_tag_delete`

Deletes a tag.

```ts
invoke<string>('git_tag_delete', { repoPath: string, name: string })
```

---

## Refs - Remotes

### `git_remote_list`

Lists remotes (fetch URLs, deduplicated by name).

```ts
interface RemoteInfo {
  name: string
  url: string
}

invoke<RemoteInfo[]>('git_remote_list', { repoPath: string })
```

---

### `git_remote_add`

Adds a remote.

```ts
invoke<string>('git_remote_add', { repoPath: string, name: string, url: string })
```

---

### `git_remote_remove`

Removes a remote.

```ts
invoke<string>('git_remote_remove', { repoPath: string, name: string })
```

---

## Meta

### `git_config_get`

Gets a config value. Only allowlisted keys are accepted
(see `ALLOWED_CONFIG_KEYS` in `commands/validation.rs`).
Set `global` to read from `~/.gitconfig` instead of the repo.

```ts
invoke<string>('git_config_get', { repoPath: string, key: string, global: boolean })
```

---

### `git_config_snapshot`

Reads every key in `ALLOWED_CONFIG_KEYS` with its effective value. No other
setting is reachable, so credentials helpers and `core.sshCommand` cannot leak.

```ts
interface ConfigEntry {
  key: string
  value: string
  allowed: boolean
}

invoke<ConfigEntry[]>('git_config_snapshot', { repoPath: string, global: boolean })
```

---

### `git_config_set`

Sets a config value (allowlisted keys only).
An empty value unsets the key.

```ts
invoke<string>('git_config_set', {
  repoPath: string,
  key: string,
  value: string,
  global: boolean
})
```

---

### `git_identity`

User identity (name, email), repo scope with global fallback.

```ts
interface Identity {
  name: string
  email: string
}

invoke<Identity>('git_identity', { repoPath: string })
```

---

### `git_version`

Installed Git version (e.g. `git version 2.43.0`).

```ts
invoke<string>('git_version', {})
```

---

### `git_remote_url`

URL of the `origin` remote (`""` when not configured).

```ts
invoke<string>('git_remote_url', { repoPath: string })
```

---

### `git_gpg`

Short GPG status of `HEAD` (`log -1 --pretty=%G?`):
`G` (valid), `U` (unknown key), `N` (not signed), etc.

```ts
invoke<string>('git_gpg', { repoPath: string })
```

---

### `git_clone`

Clones a repository (`clone --progress -- <url> <path>`).
URLs using the `ext::` / `fd::` schemes are rejected.

```ts
invoke<string>('git_clone', { url: string, path: string })
```

---

## Files - Content

### `get_file_content`

Reads a file from the working tree.
The path must be repo-relative (no `..`, no absolute paths)
and is canonicalized to stay inside the repository.

```ts
invoke<string>('get_file_content', { repoPath: string, file: string })
```

---

### `save_file_content`

Saves a file to the working tree (same path rules as above).

```ts
invoke<void>('save_file_content', { repoPath: string, file: string, content: string })
```

---

## Files - Conflicted

### `get_conflicted_files`

Lists files with unresolved conflicts (`diff --diff-filter=U`),
each with its content and parsed conflict hunks.

```ts
interface ConflictBlock {
  id: number
  startLine: number
  midLine?: number
  baseStart?: number
  baseEnd?: number
  endLine: number
  currentLabel: string
  incomingLabel: string
  current: string[]
  base: string[]
  incoming: string[]
  isDiff3: boolean
}

interface ConflictFile {
  path: string
  absPath: string
  content: string
  conflicts: ConflictBlock[]
}

invoke<ConflictFile[]>('get_conflicted_files', { repoPath: string })
```

---


## Templates

Commit templates stored as files under
`.reflog/templates/<folder>/` in the repository.
`list` returns template names; `read`/`write` transfer content.

```ts
invoke<string[]>('git_template_list', { repoPath: string, folder: string })
invoke<string>('git_template_read', { repoPath: string, folder: string, name: string })
invoke<string>('git_template_write', { repoPath: string, folder: string, name: string, content: string })
invoke<string>('git_template_delete', { repoPath: string, folder: string, name: string })
```

---

## Submodules

### `git_submodule_list`

Lists submodules with status flag (`' '`, `-`, `+`, `U`),
commit hash, path, name, URL and branch.

```ts
interface SubmoduleInfo {
  name: string
  path: string
  url: string
  branch: string
  hash: string
  state: string
}

invoke<SubmoduleInfo[]>('git_submodule_list', { repoPath: string })
```

---

### `git_submodule_update`

Updates submodules (`update --init --recursive`).
Pass `submodulePath` to update a single submodule (repo-relative path).

```ts
invoke<string>('git_submodule_update', { repoPath: string, submodulePath?: string })
```

---

### `git_superproject_chain`

Resolves the repository chain from the outermost superproject down to
`repoPath`. A plain repository resolves to a single entry; a submodule
resolves to `superproject, …, parent, repo`.

```ts
invoke<string[]>('git_superproject_chain', { repoPath: string })
// Example: ['/work/super', '/work/super/libs/lib']
```

---

## Playground

### `git_run`

Executes an allowlisted Git command for the console/debug UI.
Only verbs in `ALLOWED` (`log`, `status`, `branch`, `diff`, …) are
accepted; dangerous flags (`--hard`, `--force`, `--output`, `--upload-pack`,
`-f`, `-c`, …) and shell metacharacters are rejected.

```ts
invoke<string>('git_run', { repoPath: string, args: string[] })
// Example: ['log', '--oneline', '-10']
```

---

## Rebase

Interactive rebase with a scripted sequence editor
(`pick` / `squash` / `fixup` / `drop`; reorder by submitting `ops`
in the desired order). `reword` / `edit` are intentionally unsupported:
the backend is fully non-interactive (`GIT_EDITOR=true`).

### `git_rebase_commits`

Commits in `onto..HEAD` (newest first), for building the todo list.
Fails with `base inválida para rebase: <onto>` when `onto` doesn't
resolve to a commit.

```ts
invoke<CommitInfo[]>('git_rebase_commits', { repoPath: string, onto: string })
```

---

### `git_rebase_start`

Runs `rebase -i <onto>` with the given instructions.
The op hashes must match the current `onto..HEAD` set exactly
(stale UIs are rejected); at least one op must not be `drop`.

```ts
interface RebaseOp {
  hash: string
  action: 'pick' | 'squash' | 'fixup' | 'drop'
}

invoke<string>('git_rebase_start', { repoPath: string, onto: string, ops: RebaseOp[] })
```

On conflict the command fails and the repo is left mid-rebase
(`status.rebasing === true`); resolve and call `git_rebase_continue`.

---

### `git_rebase_continue` / `git_rebase_abort`

```ts
invoke<string>('git_rebase_continue', { repoPath: string })
invoke<string>('git_rebase_abort', { repoPath: string })
```

---

## Common Error Cases

| Error | Cause |
| ------- | ------- |
| `not a git repository` | Path is not a repo |
| `no such ref` | Branch/tag/commit doesn't exist |
| `uncommitted changes` | Operation requires clean working tree |
| `merge conflict` | Unresolved conflict |
| `nothing to commit` | Staging area empty |
| `caminho relativo inválido` | File path failed validation |
| `nome de ref inválido` | Branch/tag name failed validation |
| `chave de configuração não permitida` | Config key not in allowlist |
| `saída do git excede o limite permitido` | Output exceeded the byte limit |
| `git excedeu o tempo limite` | Command exceeded the timeout |
