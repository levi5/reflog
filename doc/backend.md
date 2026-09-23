# Backend Documentation (Rust/Tauri)

## Overview

The backend is a Rust application using Tauri 2, responsible for executing Git commands, managing the file system, and exposing an API to the frontend via IPC.

## Architecture

### Structure

```txt
src-tauri/src/
├── commands/            # Tauri Commands (IPC API)
│   ├── files/           # File operations (content, conflicted)
│   ├── history/         # History: branches, log, diff
│   ├── meta.rs          # Config, version, clone, identity, gpg
│   ├── refs.rs          # Branches, tags, remotes
│   ├── staging.rs       # Stage, commit, checkout, cherry-pick, revert, reset
│   ├── status/          # Git status (porcelain parsing)
│   ├── sync.rs          # Merge, push, pull, fetch, stash
│   ├── templates.rs     # Commit templates
│   ├── repo.rs          # Repo detection, root, init, CLI path
│   ├── submodules.rs    # Submodules
│   ├── playground.rs    # Console (allowlisted git commands)
│   ├── validation.rs    # Input validators (refs, oids, paths, URLs)
│   └── mod.rs           # run_blocking helper
├── domain/              # Rust Domain (entities, conflict parsing, errors)
├── runner.rs            # GitRunner trait + ProcessRunner (+ timeouts/limits)
└── lib.rs               # Entry point, setup, command registry
```

### Principles

1. **Trait-based abstraction** - `GitRunner` trait for testability
2. **Command pattern** - Each command is an isolated async function
3. **Error handling** - `Result<T, String>` for serializable errors
4. **Blocking operations** - `spawn_blocking` for synchronous Git commands
5. **Zero-copy where possible** - References, borrowing

## GitRunner Trait (`runner.rs`)

Abstraction for Git command execution, allowing mocking in tests.

```rust
pub trait GitRunner: Send + Sync {
    fn run(&self, repo: Option<&str>, args: &[&str]) -> Result<String, String>;
    fn run_with_timeout(
        &self,
        repo: Option<&str>,
        args: &[&str],
        timeout: Duration,
    ) -> Result<String, String>;
    fn run_env_with_timeout(
        &self,
        repo: Option<&str>,
        args: &[&str],
        env: &[(&str, &str)],
        timeout: Duration,
    ) -> Result<String, String>;
    fn run_limited(&self, repo: Option<&str>, args: &[&str], max_bytes: usize) -> Result<String, String>;
    fn run_stdin(
        &self,
        repo: Option<&str>,
        args: &[&str],
        input: &str,
    ) -> Result<String, String>;
    fn run_env(
        &self,
        repo: Option<&str>,
        args: &[&str],
        env: &[(&str, &str)],
    ) -> Result<String, String>;
    fn read_file(&self, path: &Path) -> Result<String, String>;
    fn write_file(&self, path: &Path, content: &str) -> Result<(), String>;
    fn path_exists(&self, path: &Path) -> bool;

    // Helpers with default implementation
    fn repo_root(&self, repo_path: &str) -> Result<String, String>;
    fn is_repo(&self, path: &str) -> bool;
}

// Timeouts and output caps
pub const DEFAULT_TIMEOUT: Duration = Duration::from_secs(60);
pub const NETWORK_TIMEOUT: Duration = Duration::from_secs(300);
pub const OUTPUT_LIMIT_ERROR: &str = "saída do git excede o limite permitido";
```

### Implementations

- **ProcessRunner** - Executes `git` via `std::process::Command` (production)
- **MockRunner** - In-memory implementation for tests (`#[cfg(test)]`)

### Environment Configuration

```rust
fn base_command(repo: Option<&str>) -> Command {
    let mut cmd = Command::new("git");
    if let Some(dir) = repo { cmd.arg("-C").arg(dir); }
    cmd.env("GIT_TERMINAL_PROMPT", "0");  // No interactive prompts
    cmd.env("GIT_SSH_COMMAND", "ssh -o BatchMode=yes"); // No password prompts (unless overridden)
    cmd.env("GIT_PAGER", "cat");          // Direct output
    cmd.env("GIT_EDITOR", "true");        // Don't open editor
    cmd
}
```

`stdin` is piped only when input is provided, otherwise set to null,
so commands never block waiting on inherited stdin.
`ProcessRunner::execute` streams stdout/stderr on reader threads with an
idle timeout (`DEFAULT_TIMEOUT`, 60 s; `NETWORK_TIMEOUT`, 300 s, for
network commands) and an absolute cap, plus optional per-command output
limits via `run_limited` (e.g. 2 MiB for diffs).

## AppState (`lib.rs`)

Global state managed by Tauri:

```rust
pub struct AppState {
    pub runner: Arc<dyn GitRunner>,
}
```

Registered via `.manage(AppState { runner: Arc::new(ProcessRunner) })`.

## Tauri Commands (IPC)

Registered in `lib.rs` via `tauri::generate_handler![]`.

### Categories

#### Repository (`commands/repo.rs`)

| Command | Description |
|---------|-------------|
| `check_repo` | Verifies if path is a Git repo |
| `repo_root` | Returns repository root |
| `init_repo` | Initializes Git in a directory |
| `take_cli_path` | Returns (once) the repo path passed as CLI arg |

#### Status (`commands/status/`)

| Command | Description |
|---------|-------------|
| `git_status` | Full status (staged, unstaged, untracked) |

#### History (`commands/history/`)

| Module | Commands |
| -------- | ---------- |
| `branches` | `git_branches` - List local/remote branches |
| `log` | `git_log`, `git_graph`, `git_reflog` - History |
| `diff` | `git_commit_files`, `git_commit_diff`, `git_diff`, `git_show`, `git_blame`, `git_ls_files` |

#### Staging (`commands/staging.rs`)

| Command | Description |
| --------- | ------------- |
| `git_add` | Stage files |
| `git_commit` | Create commit |
| `git_amend_commit` | Amend last commit |
| `git_checkout` | Checkout branch/commit/file |
| `git_cherry_pick` | Cherry-pick commit |
| `git_cherry_pick_continue/abort` | Continue/abort cherry-pick |
| `git_revert` | Revert commit |
| `git_revert_continue/abort` | Continue/abort revert |
| `git_reset` | Reset (soft/mixed/hard) |
| `git_unstage` | Unstage files |
| `git_discard` | Discard changes |
| `git_apply_patch` | Apply patch |

#### Sync (`commands/sync.rs`)

| Command | Description |
| --------- | ------------- |
| `git_merge_opts` | Merge branch (plain / `--squash` / `--no-ff`) |
| `git_push` | Push (retries once with `-u origin` if no upstream) |
| `git_pull` | Pull (sets upstream to `origin/<branch>` and retries if missing) |
| `git_fetch` | Fetch all remotes (optional `--prune`) |
| `git_merge_abort` | Abort merge |
| `git_stash` | Create stash |
| `git_stash_pop` | Pop stash |
| `git_stash_list` | List stashes |
| `git_stash_drop` | Drop stash |
| `git_stash_show` | Show stash contents |
| `git_stash_apply` | Apply stash |

#### Refs (`commands/refs.rs`)

| Command | Description |
| --------- | ------------- |
| `git_branch_delete` | Delete branch |
| `git_branch_rename` | Rename branch |
| `git_tag_list` | List tags |
| `git_tag_create` | Create tag |
| `git_tag_delete` | Delete tag |
| `git_remote_list` | List remotes |
| `git_remote_add` | Add remote |
| `git_remote_remove` | Remove remote |

#### Meta (`commands/meta.rs`)

| Command | Description |
| --------- | ------------- |
| `git_config_get` | Get config value |
| `git_config_set` | Set config value |
| `git_identity` | Get user identity |
| `git_version` | Git version |
| `git_remote_url` | Get remote URL |
| `git_gpg` | GPG operations |
| `git_clone` | Clone repository |

#### Files (`commands/files/`)

| Module | Commands |
|--------|----------|
| `content` | `get_file_content`, `save_file_content` |
| `conflicted` | `get_conflicted_files`, `parse_conflicts` |

#### Templates (`commands/templates.rs`)

| Command | Description |
| --------- | ------------- |
| `git_template_list` | List commit templates |
| `git_template_read` | Read template |
| `git_template_write` | Write template |
| `git_template_delete` | Delete template |

#### Submodules (`commands/submodules.rs`)

| Command | Description |
|---------|-------------|
| `git_submodule_list` | List submodules |
| `git_submodule_update` | Update submodules |

#### Playground (`commands/playground.rs`)

| Command | Description |
|---------|-------------|
| `git_run` | Execute arbitrary git command (debug) |

## Command Implementation Pattern

```rust
// commands/sync.rs
use crate::runner::GitRunner;
use crate::commands::validation::validate_ref_name;
use crate::AppState;
use tauri::State;

pub fn merge_opts(
    runner: &dyn GitRunner,
    repo_path: &str,
    branch: &str,
    squash: bool,
    no_ff: bool,
) -> Result<String, String> {
    validate_ref_name(branch)?;
    let root = runner.repo_root(repo_path)?;
    if squash {
        return runner.run(Some(&root), &["merge", "--squash", "--", branch]);
    }
    // ...
}

#[tauri::command]
pub async fn git_merge_opts(
    state: State<'_, AppState>,
    repo_path: String,
    branch: String,
    squash: bool,
    no_ff: bool,
) -> Result<String, String> {
    let runner = state.runner.clone();
    run_blocking(move || merge_opts(runner.as_ref(), &repo_path, &branch, squash, no_ff)).await
}
```

Pure logic lives in plain `pub fn`s taking `&dyn GitRunner`
(testable with `MockRunner`); the `#[tauri::command]` wrapper only
clones `AppState` and delegates via `run_blocking`.

### Helper `run_blocking`

```rust
pub(crate) async fn run_blocking<F, T>(f: F) -> Result<T, String>
where
    F: FnOnce() -> Result<T, String> + Send + 'static,
    T: Send + 'static,
{
    tauri::async_runtime::spawn_blocking(f)
        .await
        .map_err(|e| e.to_string())?
}
```

Executes blocking operations (Git) in a separate thread pool.

## Serialization

Uses `serde` for structs returned to the frontend
(see `domain/entities.rs`):

```rust
#[derive(Serialize, Deserialize, Clone)]
pub struct CommitInfo {
    pub hash: String,
    pub short: String,
    pub author: String,
    pub date: String,
    pub message: String,
    pub parents: Vec<String>,
    pub refs: Vec<String>,
}

#[derive(Serialize, Deserialize, Clone, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct StatusResult {
    pub root: String,
    pub branch: String,
    pub ahead: usize,
    pub behind: usize,
    pub files: Vec<FileStatus>,
    pub merging: bool,
    pub cherry_picking: bool, // serialized as cherryPicking
    pub reverting: bool,
}
```

## Tauri Plugins Used

| Plugin | Function |
| -------- | ---------- |
| `tauri-plugin-fs` | Read/write files, directories |
| `tauri-plugin-dialog` | Open/save dialogs, message boxes |
| `tauri-plugin-cli` | Parse command line args |
| `tauri-plugin-opener` | Open URLs, files with default app |

## Configuration (`tauri.conf.json`)

```json
{
  "build": {
    "beforeDevCommand": "pnpm run dev",
    "devUrl": "http://localhost:1420",
    "beforeBuildCommand": "pnpm run build",
    "frontendDist": "../dist"
  },
  "app": {
    "security": {
      "csp": "default-src 'self' data: blob:; ..."
    }
  }
}
```

Plus a `cli` plugin section declaring the optional `path` argument
(`reflog <path>` opens that repository), and a strict Content-Security-Policy.

## Build Profile (`Cargo.toml`)

```toml
[profile.release]
codegen-units = 1
lto = true
opt-level = 3
panic = "abort"
strip = true
```

Optimized for smaller binary and performance.

## Tests

```bash
# Unit tests (all backend tests, incl. MockRunner tests)
cargo test

# Run a single test / module
cargo test <name>
```

Tests live next to the code (`#[cfg(test)] mod tests`) and use
`runner::mock::MockRunner` (in-memory command outputs) plus `tempfile`
for filesystem cases. One test spins up real Git repositories in the
system temp dir to exercise submodules end to end.

### Mock Runner Example

```rust
#[cfg(test)]
mod tests {
    use super::runner::mock::MockRunner;

    #[test]
    fn test_git_status() {
        let runner = MockRunner::new(
            &[("status --porcelain", "M file.txt\n?? new.txt")],
            &[]
        );
        // ...
    }
}
```

## Logging and Debug

- `playground::git_run` - allowlisted arbitrary command for the in-app console
- Git failures surface `stderr` text as the command error
  (see `failure_message` in `runner.rs`)
- Tauri devtools: run `pnpm tauri dev` and use the webview inspector

## Security

1. **Input validation** (`commands/validation.rs`) - ref names reject
   `.. ~ ^ : ? * [ @{ \`, leading `-`/`.`, trailing `.`/`.lock`;
   OIDs have a charset + length cap; repo paths reject NUL/newline
   (which would panic `Command::arg`); clone URLs reject `ext::`/`fd::`
2. **No shell injection** - args passed as arrays to `Command`, never a shell string
3. **`--` separators** - revisions, paths and config keys are passed after `--`
   so values starting with `-` can't become flags
4. **Config allowlist** - `config_get`/`config_set` only accept keys in
   `ALLOWED_CONFIG_KEYS` (identity, safe core/diff/merge options)
5. **Console sandbox** (`playground.rs`) - `git_run` only allows listed verbs
   and rejects dangerous flags (`--hard`, `--force`, `-f`, `--output`,
   `--upload-pack`, `-c`, …) plus shell metacharacters
6. **FS confinement** - file commands canonicalize paths and require them
   to stay inside the repository root
7. **No hangs** - `GIT_TERMINAL_PROMPT=0`, `GIT_SSH_COMMAND="ssh -o BatchMode=yes"`,
   `GIT_EDITOR=true`, stdin nulled when unused, idle/absolute timeouts
8. **Output caps** - `run_limited` truncates-enforces byte limits
   (log/graph/reflog, diffs, file lists) so huge repos can't OOM the app
9. **FS scope** - file access goes through the backend runner, not direct renderer FS

## Performance

- **Shared state** - `AppState` holds one `Arc<dyn GitRunner>` reused by all commands
- **Non-blocking IPC** - Git runs on the `spawn_blocking` pool via `run_blocking`
  (file/template commands are the exception: they run synchronously)
- **Output limits** - `run_limited` with per-command byte caps; `log`/`graph`/`reflog`
  clamp `limit` (max 1000) and `skip`
- **Caching** - Frontend handles caching, backend stateless
