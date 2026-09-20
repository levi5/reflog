# Backend Documentation (Rust/Tauri)

## Overview

The backend is a Rust application using Tauri 2, responsible for executing Git commands, managing the file system, and exposing an API to the frontend via IPC.

## Architecture

### Structure

```txt
src-tauri/src/
├── commands/            # Tauri Commands (IPC API)
│   ├── files/           # File operations
│   ├── history/         # History, log, diff, graph
│   ├── meta/            # Config, version, clone, remotes
│   ├── refs/            # Branches, tags, remotes
│   ├── staging/         # Stage, commit, checkout, reset
│   ├── status/          # Git status
│   ├── sync/            # Push, pull, fetch, stash, merge
│   ├── templates/       # Commit templates
│   ├── repo.rs          # Repo detection, root
│   ├── submodules.rs    # Submodules
│   └── playground.rs    # Debug/experimental
├── domain/              # Rust Domain (entities, traits)
├── runner.rs            # GitRunner trait + ProcessRunner
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
    fn run_stdin(&self, repo: Option<&str>, args: &[&str], input: &str) -> Result<String, String>;
    fn run_env(&self, repo: Option<&str>, args: &[&str], env: &[(&str, &str)]) -> Result<String, String>;
    fn read_file(&self, path: &Path) -> Result<String, String>;
    fn write_file(&self, path: &Path, content: &str) -> Result<(), String>;
    fn path_exists(&self, path: &Path) -> bool;

    // Helpers with default implementation
    fn repo_root(&self, repo_path: &str) -> Result<String, String>;
    fn is_repo(&self, path: &str) -> bool;
}
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
    cmd.env("GIT_PAGER", "cat");          // Direct output
    cmd.env("GIT_EDITOR", "true");        // Don't open editor
    cmd
}
```

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
| `git_push` | Push to remote |
| `git_pull` | Pull from remote |
| `git_fetch` | Fetch remotes |
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
| `content` | `get_file_content`, `save_file_content`, `write_text_file` |
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
// commands/staging.rs
use crate::runner::GitRunner;
use tauri::State;

#[tauri::command]
pub async fn git_commit(
    repo: String,
    message: String,
    amend: Option<bool>,
    state: State<'_, AppState>,
) -> Result<(), String> {
    run_blocking(move || {
        let runner = &state.runner;
        let args = if amend.unwrap_or(false) {
            vec!["commit", "--amend", "-m", &message]
        } else {
            vec!["commit", "-m", &message]
        };
        runner.run(Some(&repo), &args)?;
        Ok(())
    }).await
}
```

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

Uses `serde` for complex structs returned to frontend:

```rust
#[derive(Serialize, Deserialize)]
pub struct GitStatus {
    pub staged: Vec<FileStatus>,
    pub unstaged: Vec<FileStatus>,
    pub untracked: Vec<String>,
    pub conflicted: Vec<String>,
}

#[derive(Serialize, Deserialize)]
pub struct FileStatus {
    pub path: String,
    pub index_status: char,
    pub worktree_status: char,
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
    "beforeBuildCommand": "pnpm build",
    "beforeDevCommand": "pnpm dev",
    "devPath": "http://localhost:1420",
    "distDir": "../dist"
  },
  "plugins": {
    "fs": { "scope": { "allow": ["$APPDATA/*", "$HOME/*"] } }
  }
}
```

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
# Unit tests
cargo test

# Integration tests (requires Tauri)
cargo test --test integration

# Mock runner tests
cargo test runner::mock
```

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

- `RUST_LOG=debug` - Detailed logs
- `tauri::async_runtime::spawn_blocking` - For debugging blocking commands
- `playground::git_run` - Arbitrary command for debug

## Security

1. **Path validation** - Repository path sanitization
2. **No shell injection** - Args passed as array, not string
3. **FS scope** - Limited via `tauri.conf.json`
4. **No terminal prompt** - `GIT_TERMINAL_PROMPT=0`
5. **No interactive editor** - `GIT_EDITOR=true`

## Performance

- **Connection pooling** - `AppState` reuse
- **Batch commands** - Group calls when possible
- **Caching** - Frontend handles caching, backend stateless
- **Streaming** - For large outputs (log, diff), consider chunked response
