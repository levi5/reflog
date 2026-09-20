# API Reference (Tauri Commands)

All functions are invoked via `@tauri-apps/api/core` `invoke()`.

```ts
import { invoke } from '@tauri-apps/api/core'

// Example
const status = await invoke<GitStatus>('git_status', { repo: '/path/to/repo' })
```

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

## Status

### `git_status`

Full working tree status.

```ts
interface GitStatus {
  staged: FileStatus[]
  unstaged: FileStatus[]
  untracked: string[]
  conflicted: string[]
}

interface FileStatus {
  path: string
  indexStatus: string    // 'A', 'M', 'D', 'R', 'C', '?'
  worktreeStatus: string // ' ', 'M', 'D', '?'
}

invoke<GitStatus>('git_status', { repo: string })
```

---

## History - Branches

### `git_branches`

Lists all branches (local and remote).

```ts
interface Branch {
  name: string
  isCurrent: boolean
  isRemote: boolean
  upstream?: string
  commitHash: string
  commitMessage: string
}

invoke<Branch[]>('git_branches', { repo: string })
```

---

## History - Log

### `git_log`

Paginated commit history.

```ts
interface Commit {
  hash: string
  shortHash: string
  message: string
  author: Signature
  committer: Signature
  parents: string[]
  date: string // ISO 8601
  refs: string[] // branch names, tags
}

interface Signature {
  name: string
  email: string
  date: string
}

interface LogOptions {
  repo: string
  limit?: number
  offset?: number
  all?: boolean
  author?: string
  since?: string
  until?: string
  path?: string
}

invoke<Commit[]>('git_log', options: LogOptions)
```

---

### `git_graph`

Data for graph visualization (DAG).

```ts
interface GraphNode {
  hash: string
  parents: string[]
  refs: string[]
  author: string
  date: string
  message: string
}

interface GraphData {
  nodes: GraphNode[]
  edges: { from: string; to: string }[]
}

invoke<GraphData>('git_graph', { repo: string, limit?: number })
```

---

### `git_reflog`

Reference log (HEAD movements).

```ts
interface ReflogEntry {
  hash: string
  shortHash: string
  action: string // 'commit', 'checkout', 'reset', 'merge', etc.
  message: string
  date: string
}

invoke<ReflogEntry[]>('git_reflog', { repo: string, limit?: number })
```

---

## History - Diff

### `git_commit_files`

Files changed in a commit.

```ts
interface CommitFile {
  path: string
  status: 'A' | 'M' | 'D' | 'R' | 'C'
  oldPath?: string // for renames
}

invoke<CommitFile[]>('git_commit_files', { repo: string, hash: string })
```

---

### `git_commit_diff`

Full diff of a commit.

```ts
interface DiffHunk {
  oldStart: number
  oldLines: number
  newStart: number
  newLines: number
  lines: DiffLine[]
}

interface DiffLine {
  type: 'context' | 'add' | 'remove'
  content: string
  oldLineNumber?: number
  newLineNumber?: number
}

interface FileDiff {
  path: string
  oldPath?: string
  status: 'A' | 'M' | 'D' | 'R' | 'C'
  hunks: DiffHunk[]
  binary: boolean
}

invoke<FileDiff[]>('git_commit_diff', { repo: string, hash: string })
```

---

### `git_diff`

Working tree or staged diff.

```ts
interface DiffOptions {
  repo: string
  staged?: boolean
  path?: string
  cached?: boolean
}

invoke<FileDiff[]>('git_diff', options: DiffOptions)
```

---

### `git_show`

Content of a file at a specific commit.

```ts
invoke<string>('git_show', { repo: string, revision: string, path: string })
// revision: 'HEAD', 'abc123', 'HEAD~1', 'branch:name'
```

---

### `git_blame`

Line-by-line annotation.

```ts
interface BlameLine {
  lineNumber: number
  content: string
  commitHash: string
  author: string
  authorEmail: string
  date: string
  summary: string
}

invoke<BlameLine[]>('git_blame', { repo: string, path: string, startLine?: number, endLine?: number })
```

---

### `git_ls_files`

Lists tracked files.

```ts
interface LsFile {
  path: string
  mode: string
  stage: number
  hash: string
}

invoke<LsFile[]>('git_ls_files', { repo: string, cached?: boolean })
```

---

## Staging

### `git_add`

Stage files.

```ts
invoke<void>('git_add', { repo: string, files: string[] })
// files: ['file.txt', 'dir/'] or ['.'] for all
```

---

### `git_commit`

Creates a commit.

```ts
invoke<void>('git_commit', {
  repo: string,
  message: string,
  amend?: boolean,
  author?: { name: string; email: string }
})
```

---

### `git_amend_commit`

Amends the last commit.

```ts
invoke<void>('git_amend_commit', {
  repo: string,
  message: string,
  noEdit?: boolean
})
```

---

### `git_checkout`

Checkout branch, commit, or file.

```ts
interface CheckoutOptions {
  repo: string
  target: string        // branch name, commit hash, or 'HEAD'
  paths?: string[]      // if empty, checkout branch/commit
  createBranch?: boolean // -b
  force?: boolean        // -f
}

invoke<void>('git_checkout', options: CheckoutOptions)
```

---

### `git_cherry_pick`

Cherry-pick commit(s).

```ts
invoke<void>('git_cherry_pick', { repo: string, commit: string })
```

### `git_cherry_pick_continue`

Continues after resolving conflicts.

```ts
invoke<void>('git_cherry_pick_continue', { repo: string })
```

### `git_cherry_pick_abort`

Aborts cherry-pick.

```ts
invoke<void>('git_cherry_pick_abort', { repo: string })
```

---

### `git_revert`

Reverts a commit.

```ts
invoke<void>('git_revert', {
  repo: string,
  commit: string,
  noCommit?: boolean // -n
})
```

### `git_revert_continue` / `git_revert_abort`

```ts
invoke<void>('git_revert_continue', { repo: string })
invoke<void>('git_revert_abort', { repo: string })
```

---

### `git_reset`

Reset (soft/mixed/hard).

```ts
interface ResetOptions {
  repo: string
  mode: 'soft' | 'mixed' | 'hard'
  target?: string // commit hash, default HEAD
  paths?: string[] // for mixed: unstage specific files
}

invoke<void>('git_reset', options: ResetOptions)
```

---

### `git_unstage`

Unstage files (equivalent to `reset HEAD -- <files>`).

```ts
invoke<void>('git_unstage', { repo: string, files: string[] })
```

---

### `git_discard`

Discards changes in working tree.

```ts
invoke<void>('git_discard', { repo: string, files: string[] })
// files: ['file.txt'] or ['.'] for all
```

---

### `git_apply_patch`

Applies a patch.

```ts
invoke<void>('git_apply_patch', {
  repo: string,
  patch: string,
  check?: boolean // --check only
})
```

---

## Sync

### `git_push`

Push to remote.

```ts
interface PushOptions {
  repo: string
  remote?: string      // default: 'origin'
  branch?: string      // default: current branch
  force?: boolean
  forceWithLease?: boolean
  tags?: boolean
  setUpstream?: boolean
}

invoke<void>('git_push', options: PushOptions)
```

---

### `git_pull`

Pull from remote.

```ts
interface PullOptions {
  repo: string
  remote?: string
  branch?: string
  rebase?: boolean
  noRebase?: boolean
}

invoke<void>('git_pull', options: PullOptions)
```

---

### `git_fetch`

Fetch remotes.

```ts
interface FetchOptions {
  repo: string
  remote?: string        // default: all
  prune?: boolean
  tags?: boolean
}

invoke<void>('git_fetch', options: FetchOptions)
```

---

### `git_merge_abort`

Aborts in-progress merge.

```ts
invoke<void>('git_merge_abort', { repo: string })
```

---

### `git_stash`

Creates a stash.

```ts
interface StashOptions {
  repo: string
  message?: string
  includeUntracked?: boolean // -u
  keepIndex?: boolean        // --keep-index
}

invoke<void>('git_stash', options: StashOptions)
```

---

### `git_stash_pop`

Pop stash (apply and remove).

```ts
invoke<void>('git_stash_pop', { repo: string, index?: number })
```

---

### `git_stash_list`

Lists stashes.

```ts
interface StashEntry {
  index: number
  message: string
  branch: string
  hash: string
  date: string
}

invoke<StashEntry[]>('git_stash_list', { repo: string })
```

---

### `git_stash_drop`

Removes a stash.

```ts
invoke<void>('git_stash_drop', { repo: string, index: number })
```

---

### `git_stash_show`

Shows stash contents.

```ts
interface StashDiff {
  files: FileDiff[]
}

invoke<StashDiff>('git_stash_show', { repo: string, index: number })
```

---

### `git_stash_apply`

Applies stash without removing.

```ts
invoke<void>('git_stash_apply', { repo: string, index: number })
```

---

## Refs - Branches

### `git_branch_delete`

Deletes a branch.

```ts
invoke<void>('git_branch_delete', {
  repo: string,
  name: string,
  force?: boolean
})
```

---

### `git_branch_rename`

Renames a branch.

```ts
invoke<void>('git_branch_rename', {
  repo: string,
  oldName: string,
  newName: string
})
```

---

## Refs - Tags

### `git_tag_list`

Lists tags.

```ts
interface Tag {
  name: string
  hash: string
  message?: string
  tagger?: Signature
  date?: string
}

invoke<Tag[]>('git_tag_list', { repo: string, pattern?: string })
```

---

### `git_tag_create`

Creates a tag.

```ts
interface TagCreateOptions {
  repo: string
  name: string
  target?: string      // commit hash, default HEAD
  message?: string     // annotated tag
  force?: boolean
  sign?: boolean       // -s
}

invoke<void>('git_tag_create', options: TagCreateOptions)
```

---

### `git_tag_delete`

Deletes a tag.

```ts
invoke<void>('git_tag_delete', { repo: string, name: string })
```

---

## Refs - Remotes

### `git_remote_list`

Lists remotes.

```ts
interface Remote {
  name: string
  url: string
  fetchUrl?: string
  pushUrl?: string
}

invoke<Remote[]>('git_remote_list', { repo: string })
```

---

### `git_remote_add`

Adds a remote.

```ts
invoke<void>('git_remote_add', { repo: string, name: string, url: string })
```

---

### `git_remote_remove`

Removes a remote.

```ts
invoke<void>('git_remote_remove', { repo: string, name: string })
```

---

## Meta

### `git_config_get`

Gets a config value.

```ts
invoke<string>('git_config_get', { repo: string, key: string, scope?: 'local' | 'global' | 'system' })
```

---

### `git_config_set`

Sets a config value.

```ts
invoke<void>('git_config_set', {
  repo: string,
  key: string,
  value: string,
  scope?: 'local' | 'global'
})
```

---

### `git_identity`

User identity (name, email).

```ts
interface Identity {
  name: string
  email: string
}

invoke<Identity>('git_identity', { repo: string })
```

---

### `git_version`

Installed Git version.

```ts
invoke<string>('git_version', {})
```

---

### `git_remote_url`

Remote URL.

```ts
invoke<string>('git_remote_url', { repo: string, remote?: string })
```

---

### `git_gpg`

GPG operations.

```ts
interface GpgKey {
  keyId: string
  userId: string
  created: string
  expires?: string
}

invoke<GpgKey[]>('git_gpg', { repo: string, action: 'list' | 'sign' | 'verify', data?: string })
```

---

### `git_clone`

Clones a repository.

```ts
interface CloneOptions {
  url: string
  path: string
  branch?: string
  depth?: number
  recursive?: boolean
}

invoke<void>('git_clone', options: CloneOptions)
```

---

## Files - Content

### `get_file_content`

Reads a file from working tree.

```ts
invoke<string>('get_file_content', { repo: string, path: string })
```

---

### `save_file_content`

Saves a file to working tree.

```ts
invoke<void>('save_file_content', { repo: string, path: string, content: string })
```

---

### `write_text_file`

Writes a file (creates directories if needed).

```ts
invoke<void>('write_text_file', { path: string, content: string })
```

---

## Files - Conflicted

### `get_conflicted_files`

Lists files with conflicts.

```ts
interface ConflictedFile {
  path: string
  ours: string
  theirs: string
  base?: string
}

invoke<ConflictedFile[]>('get_conflicted_files', { repo: string })
```

---

### `parse_conflicts`

Parses conflict markers in a file.

```ts
interface ConflictHunk {
  startLine: number
  endLine: number
  ours: string[]
  theirs: string[]
  base?: string[]
}

invoke<ConflictHunk[]>('parse_conflicts', { repo: string, path: string })
```

---

## Templates

### `git_template_list`

Lists commit templates.

```ts
interface CommitTemplate {
  name: string
  content: string
  isDefault: boolean
}

invoke<CommitTemplate[]>('git_template_list', { repo: string })
```

---

### `git_template_read`

Reads a template.

```ts
invoke<string>('git_template_read', { repo: string, name: string })
```

---

### `git_template_write`

Writes a template.

```ts
invoke<void>('git_template_write', { repo: string, name: string, content: string })
```

---

### `git_template_delete`

Deletes a template.

```ts
invoke<void>('git_template_delete', { repo: string, name: string })
```

---

## Submodules

### `git_submodule_list`

Lists submodules.

```ts
interface Submodule {
  name: string
  path: string
  url: string
  branch?: string
  commit: string
  status: 'uninitialized' | 'modified' | 'clean'
}

invoke<Submodule[]>('git_submodule_list', { repo: string })
```

---

### `git_submodule_update`

Updates submodules.

```ts
invoke<void>('git_submodule_update', {
  repo: string,
  init?: boolean,
  recursive?: boolean,
  remote?: boolean
})
```

---

## Playground

### `git_run`

Executes arbitrary Git command (debug).

```ts
invoke<string>('git_run', { repo: string, args: string[] })
// Example: ['log', '--oneline', '-10']
```

---

## Common Types (TypeScript)

```ts
// src/types/tauri.ts
export interface TauriError {
  message: string
  code?: string
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  hasMore: boolean
}

// Helper for invocation with error handling
export async function invokeSafe<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  try {
    return await invoke<T>(command, args)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(`Tauri command '${command}' failed: ${message}`)
  }
}
```

---

## Common Error Codes

| Error | Cause |
| ------- | ------- |
| `not a git repository` | Path is not a repo |
| `no such ref` | Branch/tag/commit doesn't exist |
| `uncommitted changes` | Operation requires clean working tree |
| `merge conflict` | Unresolved conflict |
| `nothing to commit` | Staging area empty |
| `permission denied` | File/SSH permissions |
| `authentication failed` | Invalid Git credentials |
