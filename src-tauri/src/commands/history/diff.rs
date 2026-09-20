use crate::runner::GitRunner;
use crate::domain::CommitFileChange;

use crate::AppState;
use tauri::State;

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
    runner.run(Some(&root), &args)
}

pub fn show_of(
    runner: &dyn GitRunner,
    repo_path: &str,
    rev: &str,
) -> Result<String, String> {
    let root = runner.repo_root(repo_path)?;
    runner.run(Some(&root), &["show", "--stat", rev])
}

pub fn commit_files_of(
    runner: &dyn GitRunner,
    repo_path: &str,
    rev: &str,
) -> Result<Vec<CommitFileChange>, String> {
    let root = runner.repo_root(repo_path)?;
    let out = runner.run(Some(&root), &["diff-tree", "--no-commit-id", "--name-status", "-r", rev])?;
    let mut files = vec![];
    for line in out.lines() {
        let mut it = line.split('\t');
        let status = it.next().unwrap_or("M").trim().to_string();
        let path = it.next().unwrap_or("").trim().to_string();
        if !path.is_empty() {
            files.push(CommitFileChange { status, path });
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
            runner.run(Some(&root), &["show", rev, "--", &f])
        }
        _ => {
            runner.run(Some(&root), &["show", rev])
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
                    "diff-tree --no-commit-id --name-status -r abc1234",
                    "M\tsrc/index.ts\nA\tsrc/types.ts\nD\told.txt",
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
}

