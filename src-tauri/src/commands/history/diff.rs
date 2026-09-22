use crate::runner::GitRunner;
use crate::domain::CommitFileChange;

use crate::AppState;
use tauri::State;

const MAX_DIFF_OUTPUT_BYTES: usize = 2 * 1024 * 1024;
const MAX_FILE_LIST_OUTPUT_BYTES: usize = 512 * 1024;

pub fn diff_of(
    runner: &dyn GitRunner,
    repo_path: &str,
    file: &str,
    staged: bool,
) -> Result<String, String> {
    let root = runner.repo_root(repo_path)?;
    let mut args = vec!["diff"];
    if staged {
        args.push("--cached");
    }
    args.push("--");
    args.push(file);
    runner.run_limited(Some(&root), &args, MAX_DIFF_OUTPUT_BYTES)
}

pub fn show_of(
    runner: &dyn GitRunner,
    repo_path: &str,
    rev: &str,
) -> Result<String, String> {
    let root = runner.repo_root(repo_path)?;
    runner.run_limited(Some(&root), &["show", "--stat", rev], MAX_FILE_LIST_OUTPUT_BYTES)
}

pub fn commit_files_of(
    runner: &dyn GitRunner,
    repo_path: &str,
    rev: &str,
) -> Result<Vec<CommitFileChange>, String> {
    let root = runner.repo_root(repo_path)?;
    let out = runner.run_limited(
        Some(&root),
        &["diff-tree", "--no-commit-id", "--name-status", "-z", "--root", "--first-parent", "-r", rev],
        MAX_FILE_LIST_OUTPUT_BYTES,
    )?;
    let mut files = vec![];
    let mut entries = out.split('\0').filter(|entry| !entry.is_empty());
    while let Some(status) = entries.next() {
        let status = status.to_string();
        let first_path = entries.next().unwrap_or("").to_string();
        let (path, old_path) = if status.starts_with('R') || status.starts_with('C') {
            (entries.next().unwrap_or("").to_string(), Some(first_path))
        } else {
            (first_path, None)
        };
        if !path.is_empty() {
            files.push(CommitFileChange { status, path, old_path });
        }
    }
    Ok(files)
}

pub fn commit_diff_of(
    runner: &dyn GitRunner,
    repo_path: &str,
    rev: &str,
    file: Option<String>,
) -> Result<String, String> {
    let root = runner.repo_root(repo_path)?;
    match file {
        Some(f) if !f.trim().is_empty() => {
            runner.run_limited(Some(&root), &["show", "--first-parent", rev, "--", &f], MAX_DIFF_OUTPUT_BYTES)
        }
        _ => {
            runner.run_limited(Some(&root), &["show", "--first-parent", rev], MAX_DIFF_OUTPUT_BYTES)
        }
    }
}


pub fn blame_of(
    runner: &dyn GitRunner,
    repo_path: &str,
    file: &str,
) -> Result<String, String> {
    let root = runner.repo_root(repo_path)?;
    runner.run(
        Some(&root),
        &["blame", "--line-porcelain", "--", file],
    )
}

pub fn ls_files_of(
    runner: &dyn GitRunner,
    repo_path: &str,
) -> Result<Vec<String>, String> {
    let root = runner.repo_root(repo_path)?;
    let out = runner.run(Some(&root), &["ls-files"])?;
    Ok(out
        .lines()
        .map(|l| l.trim().to_string())
        .filter(|l| !l.is_empty())
        .collect())
}

#[tauri::command]
pub async fn git_diff(
    state: State<'_, AppState>,
    repo_path: String,
    file: String,
    staged: bool,
) -> Result<String, String> {
    let runner = state.runner.clone();
    crate::commands::run_blocking(move || diff_of(runner.as_ref(), &repo_path, &file, staged)).await
}

#[tauri::command]
pub async fn git_show(
    state: State<'_, AppState>,
    repo_path: String,
    rev: String,
) -> Result<String, String> {
    let runner = state.runner.clone();
    crate::commands::run_blocking(move || show_of(runner.as_ref(), &repo_path, &rev)).await
}

#[tauri::command]
pub async fn git_blame(
    state: State<'_, AppState>,
    repo_path: String,
    file: String,
) -> Result<String, String> {
    let runner = state.runner.clone();
    crate::commands::run_blocking(move || blame_of(runner.as_ref(), &repo_path, &file)).await
}

#[tauri::command]
pub async fn git_ls_files(
    state: State<'_, AppState>,
    repo_path: String,
) -> Result<Vec<String>, String> {
    let runner = state.runner.clone();
    crate::commands::run_blocking(move || ls_files_of(runner.as_ref(), &repo_path)).await
}

#[tauri::command]
pub async fn git_commit_files(
    state: State<'_, AppState>,
    repo_path: String,
    rev: String,
) -> Result<Vec<CommitFileChange>, String> {
    let runner = state.runner.clone();
    crate::commands::run_blocking(move || commit_files_of(runner.as_ref(), &repo_path, &rev)).await
}

#[tauri::command]
pub async fn git_commit_diff(
    state: State<'_, AppState>,
    repo_path: String,
    rev: String,
    file: Option<String>,
) -> Result<String, String> {
    let runner = state.runner.clone();
    crate::commands::run_blocking(move || commit_diff_of(runner.as_ref(), &repo_path, &rev, file)).await
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::runner::mock::MockRunner;

    #[test]
    fn parses_commit_files_status_and_path() {
        let runner = MockRunner::new(
            &[
                ("rev-parse --show-toplevel", "/r"),
                (
                    "diff-tree --no-commit-id --name-status -z --root --first-parent -r abc1234",
                    "M\0src/index.ts\0A\0src/types.ts\0D\0old.txt\0",
                ),
            ],
            &[],
        );
        let files = commit_files_of(&runner, "/r", "abc1234").unwrap();
        assert_eq!(files.len(), 3);
        assert_eq!(files[0].status, "M");
        assert_eq!(files[0].path, "src/index.ts");
        assert_eq!(files[1].status, "A");
        assert_eq!(files[1].path, "src/types.ts");
        assert_eq!(files[2].status, "D");
        assert_eq!(files[2].path, "old.txt");
    }

    #[test]
    fn parses_renames_and_special_paths() {
        let runner = MockRunner::new(
            &[
                ("rev-parse --show-toplevel", "/r"),
                (
                    "diff-tree --no-commit-id --name-status -z --root --first-parent -r abc1234",
                    "R100\0old\tname\0new\tname\0",
                ),
            ],
            &[],
        );
        let files = commit_files_of(&runner, "/r", "abc1234").unwrap();
        assert_eq!(files[0].path, "new\tname");
        assert_eq!(files[0].old_path.as_deref(), Some("old\tname"));
    }

    #[test]
    fn uses_first_parent_for_merge_file_diffs() {
        let runner = MockRunner::new(
            &[
                ("rev-parse --show-toplevel", "/r"),
                ("show --first-parent merge123 -- src/file.ts", "diff --git a/src/file.ts b/src/file.ts"),
            ],
            &[],
        );
        assert!(commit_diff_of(&runner, "/r", "merge123", Some("src/file.ts".to_string())).is_ok());
    }
}
